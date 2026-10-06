import type { ReminderChannel } from "@prisma/client";
import type { TenantDb } from "@/server/db/tenant";
import { addDays, fmtDate, fullName, startOfDay } from "@/lib/format";
import { DEFAULT_TEMPLATE, providerFor, renderTemplate } from "./messaging";
import { getSetting } from "./ops";

export type ReminderSettings = { d7: boolean; d3: boolean; d1: boolean; d0: boolean; overdue3: boolean; channels: ReminderChannel[]; template: string };
export const defaultReminderSettings: ReminderSettings = { d7: true, d3: true, d1: true, d0: true, overdue3: true, channels: ["EMAIL"], template: DEFAULT_TEMPLATE };

const OFFSETS: [keyof ReminderSettings, number][] = [["d7", 7], ["d3", 3], ["d1", 1], ["d0", 0], ["overdue3", -3]];

async function deliver(db: TenantDb, tenantId: string, gymName: string, member: { id: string; firstName: string; lastName: string | null; phone: string; email: string | null }, amount: number, due: Date, s: ReminderSettings, type: "PAYMENT_DUE" | "MEMBERSHIP_EXPIRING") {
  const text = renderTemplate(s.template || DEFAULT_TEMPLATE, { member_name: fullName(member), amount: (amount / 100).toLocaleString("en-IN"), due_date: fmtDate(due), gym_name: gymName });
  await db.notification.create({ data: { tenantId, memberId: member.id, type, title: type === "PAYMENT_DUE" ? "Membership payment due" : "Membership expiring", body: text } });
  const results: { channel: ReminderChannel; ok: boolean }[] = [];
  for (const channel of s.channels) {
    const p = providerFor(channel);
    const to = channel === "EMAIL" ? member.email : member.phone;
    const rem = await db.reminder.create({ data: { tenantId, memberId: member.id, channel, template: text, scheduledAt: new Date(), status: "SCHEDULED" } });
    if (!to) { await db.reminder.update({ where: { id: rem.id }, data: { status: "FAILED", error: `Member has no ${channel === "EMAIL" ? "email" : "phone"}` } }); results.push({ channel, ok: false }); continue; }
    const r = p.configured() ? await p.send(to, text, "Membership reminder") : { ok: false, error: `${channel} provider not configured` };
    await db.reminder.update({ where: { id: rem.id }, data: r.ok ? { status: "SENT", sentAt: new Date() } : { status: "FAILED", error: r.error } });
    results.push({ channel, ok: r.ok });
  }
  return results;
}

/** Manual "Send Reminder" button. Always creates an in-app notification; external channels follow settings. */
export async function sendReminderNow(db: TenantDb, tenantId: string, memberId: string) {
  const [member, gym, s] = await Promise.all([
    db.member.findFirst({ where: { id: memberId, deletedAt: null }, include: { memberships: { orderBy: { endDate: "desc" }, take: 1, include: { plan: true } } } }),
    db.gym.findFirstOrThrow(), getSetting(db, "reminders", defaultReminderSettings),
  ]);
  if (!member) throw new Error("Member not found");
  const ms = member.memberships[0];
  return deliver(db, tenantId, gym.name, member, ms?.plan.price ?? 0, ms?.endDate ?? new Date(), s, "PAYMENT_DUE");
}

/** Daily automation: 7/3/1 days before, on the due date, and 3 days after. Idempotent per member per day. */
export async function runReminderEngine(db: TenantDb, tenantId: string, now = new Date()) {
  const [gym, s] = await Promise.all([db.gym.findFirstOrThrow(), getSetting(db, "reminders", defaultReminderSettings)]);
  const today = startOfDay(now);
  let sent = 0;
  for (const [key, before] of OFFSETS) {
    if (!s[key]) continue;
    const target = addDays(today, before);
    const ms = await db.memberMembership.findMany({
      where: { status: { in: ["ACTIVE", "EXPIRED"] }, endDate: { gte: target, lt: addDays(target, 1) }, member: { deletedAt: null, status: { not: "INACTIVE" } } },
      include: { member: true, plan: true },
    });
    for (const m of ms) {
      const already = await db.notification.findFirst({ where: { memberId: m.memberId, type: before < 0 ? "PAYMENT_DUE" : "MEMBERSHIP_EXPIRING", createdAt: { gte: today } } });
      if (already) continue;
      await deliver(db, tenantId, gym.name, m.member, m.plan.price, m.endDate, s, before < 0 ? "PAYMENT_DUE" : "MEMBERSHIP_EXPIRING");
      sent++;
    }
  }
  return sent;
}

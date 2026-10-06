import { z } from "zod";
import type { TenantDb, TenantTx } from "@/server/db/tenant";
import { DomainError } from "@/server/errors";
import { addDays, startOfDay } from "@/lib/format";
import { rupeesToMinor } from "@/lib/format";

const optNum = z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().min(0).optional());

export const planInput = z.object({
  name: z.string().trim().min(2).max(80),
  durationDays: z.coerce.number().int().min(1).max(3650),
  price: z.coerce.number().min(0).max(10_000_000),
  description: z.string().trim().max(500).optional(),
  accessType: z.string().trim().max(40).default("FULL"),
  freezeDays: optNum,
  trainerIncluded: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
});

export async function createPlan(db: TenantDb, tenantId: string, raw: unknown) {
  const i = planInput.parse(raw);
  return db.membershipPlan.create({ data: { tenantId, name: i.name, durationDays: i.durationDays, price: rupeesToMinor(i.price),
    description: i.description, accessType: i.accessType, freezeDays: i.freezeDays ?? 0, trainerIncluded: i.trainerIncluded } });
}

export async function updatePlan(db: TenantDb, id: string, raw: unknown) {
  const i = planInput.parse(raw);
  return db.membershipPlan.update({ where: { id }, data: { name: i.name, durationDays: i.durationDays, price: rupeesToMinor(i.price),
    description: i.description, accessType: i.accessType, freezeDays: i.freezeDays ?? 0, trainerIncluded: i.trainerIncluded } });
}

/**
 * Starts or renews a membership. If the member still has an active membership,
 * the new term begins when it ends (no lost days); otherwise it starts today
 * (or at `startDate`).
 */
export async function assignMembership(tx: TenantTx, tenantId: string, memberId: string, planId: string, opts: { startDate?: Date; price?: number } = {}) {
  const [plan, member] = await Promise.all([
    tx.membershipPlan.findFirst({ where: { id: planId, isActive: true } }),
    tx.member.findFirst({ where: { id: memberId, deletedAt: null } }),
  ]);
  if (!plan) throw new DomainError("Membership plan not found or inactive.");
  if (!member) throw new DomainError("Member not found.");

  const today = startOfDay();
  const current = await tx.memberMembership.findFirst({
    where: { memberId, status: { in: ["ACTIVE", "FROZEN", "PENDING"] }, endDate: { gte: today } },
    orderBy: { endDate: "desc" },
  });
  const start = opts.startDate ?? (current ? addDays(current.endDate, 1) : today);
  const end = addDays(start, plan.durationDays - 1);
  const status = start > today ? "PENDING" : "ACTIVE";

  const ms = await tx.memberMembership.create({
    data: { tenantId, memberId, planId, startDate: start, endDate: end, status, price: opts.price ?? plan.price },
  });
  await tx.member.update({ where: { id: memberId }, data: { status: "ACTIVE" } });
  return ms;
}

export const freezeInput = z.object({
  from: z.coerce.date(), to: z.coerce.date(), reason: z.string().trim().max(300).optional(),
});

export async function freezeMembership(db: TenantDb, membershipId: string, raw: unknown) {
  const i = freezeInput.parse(raw);
  if (i.to < i.from) throw new DomainError("Freeze end must be after the start.");
  const days = Math.round((i.to.getTime() - i.from.getTime()) / 86_400_000) + 1;
  return db.$transaction(async (tx) => {
    const ms = await tx.memberMembership.findFirst({ where: { id: membershipId }, include: { plan: true } });
    if (!ms) throw new DomainError("Membership not found.");
    if (ms.status !== "ACTIVE") throw new DomainError("Only an active membership can be frozen.");
    if (days > ms.plan.freezeDays) throw new DomainError(`This plan allows at most ${ms.plan.freezeDays} freeze day(s).`);
    const setting = await tx.setting.findFirst({ where: { key: "membership" } });
    const extend = ((setting?.value ?? {}) as { extendOnFreeze?: boolean }).extendOnFreeze !== false;
    return tx.memberMembership.update({
      where: { id: membershipId },
      data: { status: "FROZEN", frozenFrom: i.from, frozenTo: i.to, freezeReason: i.reason,
        ...(extend ? { endDate: addDays(ms.endDate, days) } : {}) },
    });
  });
}

export async function unfreezeMembership(db: TenantDb, membershipId: string) {
  return db.memberMembership.update({ where: { id: membershipId }, data: { status: "ACTIVE" } });
}

export const isCurrentlyActive = (m: { status: string; endDate: Date; startDate: Date }, now = new Date()) =>
  m.status === "ACTIVE" && m.endDate >= startOfDay(now) && m.startDate <= now;

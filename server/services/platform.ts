import { prisma } from "@/server/db/prisma";
import { addDays } from "@/lib/format";

export type PlatformSettings = { trialDays: number; maintenance: boolean; banner: string };
const DEFAULTS: PlatformSettings = { trialDays: 14, maintenance: false, banner: "" };

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const rows = await prisma.platformSetting.findMany();
  const o = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return { ...DEFAULTS, ...o } as PlatformSettings;
}
export const setPlatformSetting = (key: keyof PlatformSettings, value: string | number | boolean) =>
  prisma.platformSetting.upsert({ where: { key }, update: { value }, create: { key, value } });

/** Recompute the right status when re-activating a suspended gym. */
export async function activateTenant(tenantId: string) {
  const t = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
  const sub = await prisma.subscription.findFirst({ where: { tenantId, status: "ACTIVE", renewsAt: { gt: new Date() } } });
  const status = sub ? "ACTIVE" : t.trialEndsAt && t.trialEndsAt > new Date() ? "TRIAL" : "EXPIRED";
  return prisma.tenant.update({ where: { id: tenantId }, data: { status } });
}

export async function extendTrial(tenantId: string, days: number) {
  const t = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
  const base = t.trialEndsAt && t.trialEndsAt > new Date() ? t.trialEndsAt : new Date();
  return prisma.tenant.update({ where: { id: tenantId }, data: { trialEndsAt: addDays(base, days), status: t.status === "EXPIRED" ? "TRIAL" : t.status } });
}

export async function platformStats() {
  const since30 = addDays(new Date(), -30);
  const [gyms, trial, active, expired, suspended, members, newGyms, activeSubs, revenueAgg, leads, openTickets] = await Promise.all([
    prisma.tenant.count({ where: { deletedAt: null, isDemo: false } }), prisma.tenant.count({ where: { status: "TRIAL", isDemo: false } }), prisma.tenant.count({ where: { status: "ACTIVE", isDemo: false } }),
    prisma.tenant.count({ where: { status: "EXPIRED" } }), prisma.tenant.count({ where: { status: "SUSPENDED" } }), prisma.member.count({ where: { tenant: { isDemo: false } } }),
    prisma.tenant.count({ where: { createdAt: { gte: since30 }, isDemo: false } }), prisma.subscription.findMany({ where: { status: "ACTIVE" }, select: { amount: true } }),
    prisma.subscription.aggregate({ _sum: { amount: true }, where: { razorpayPaymentId: { not: null } } }), prisma.lead.count({ where: { status: "NEW" } }), prisma.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
  ]);
  const mrr = activeSubs.reduce((s, x) => s + x.amount, 0);
  return { gyms, trial, active, expired, suspended, members, newGyms, mrr, arr: mrr * 12, revenue: revenueAgg._sum.amount ?? 0, leads, openTickets };
}

export async function gymsByMonth(months = 6) {
  const from = new Date(new Date().getFullYear(), new Date().getMonth() - (months - 1), 1);
  const rows = await prisma.tenant.findMany({ where: { createdAt: { gte: from }, isDemo: false }, select: { createdAt: true } });
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(from.getFullYear(), from.getMonth() + i, 1);
    return { label: d.toLocaleDateString("en-IN", { month: "short" }), value: rows.filter((r) => r.createdAt.getMonth() === d.getMonth() && r.createdAt.getFullYear() === d.getFullYear()).length };
  });
}

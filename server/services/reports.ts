import type { TenantDb } from "@/server/db/tenant";
import { addDays, startOfDay } from "@/lib/format";

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const monthLabel = (k: string) => {
  const d = new Date(`${k}-01`);
  const m = d.toLocaleDateString("en-IN", { month: "short" });
  return d.getMonth() === 0 ? `${m} ${String(d.getFullYear()).slice(2)}` : m; // year only on January
};

function lastMonths(n: number) {
  const out: string[] = []; const d = new Date(); d.setDate(1);
  for (let i = n - 1; i >= 0; i--) out.push(monthKey(new Date(d.getFullYear(), d.getMonth() - i, 1)));
  return out;
}

export async function monthlyRevenue(db: TenantDb, months = 12) {
  const keys = lastMonths(months);
  const from = new Date(`${keys[0]}-01`);
  const rows = await db.payment.findMany({ where: { status: { in: ["PAID", "REFUNDED"] }, paidAt: { gte: from } }, select: { finalAmount: true, paidAt: true } });
  const sum: Record<string, number> = Object.fromEntries(keys.map((k) => [k, 0]));
  for (const r of rows) if (r.paidAt) { const k = monthKey(r.paidAt); if (k in sum) sum[k]! += r.finalAmount; }
  return keys.map((k) => ({ key: k, label: monthLabel(k), value: sum[k]! }));
}

export async function monthlyExpenses(db: TenantDb, months = 12) {
  const keys = lastMonths(months);
  const rows = await db.expense.findMany({ where: { date: { gte: new Date(`${keys[0]}-01`) } }, select: { amount: true, date: true, category: true } });
  const sum: Record<string, number> = Object.fromEntries(keys.map((k) => [k, 0]));
  const byCategory: Record<string, number> = {};
  for (const r of rows) { const k = monthKey(r.date); if (k in sum) sum[k]! += r.amount; byCategory[r.category] = (byCategory[r.category] ?? 0) + r.amount; }
  return { monthly: keys.map((k) => ({ key: k, label: monthLabel(k), value: sum[k]! })), byCategory };
}

export async function membershipGrowth(db: TenantDb, months = 12) {
  const keys = lastMonths(months);
  const rows = await db.member.findMany({ where: { deletedAt: null, joinDate: { gte: new Date(`${keys[0]}-01`) } }, select: { joinDate: true } });
  const sum: Record<string, number> = Object.fromEntries(keys.map((k) => [k, 0]));
  for (const r of rows) { const k = monthKey(r.joinDate); if (k in sum) sum[k]! += 1; }
  return keys.map((k) => ({ key: k, label: monthLabel(k), value: sum[k]! }));
}

export async function attendanceTrend(db: TenantDb, days = 30) {
  const from = addDays(startOfDay(), -(days - 1));
  const rows = await db.attendance.findMany({ where: { checkInAt: { gte: from } }, select: { checkInAt: true } });
  const buckets = Array.from({ length: days }, (_, i) => ({ date: addDays(from, i), value: 0 }));
  for (const r of rows) { const i = Math.floor((startOfDay(r.checkInAt).getTime() - from.getTime()) / 86_400_000); if (buckets[i]) buckets[i]!.value++; }
  return buckets.map((b) => ({ label: b.date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }), value: b.value }));
}

export async function memberStats(db: TenantDb) {
  const members = await db.member.findMany({ where: { deletedAt: null }, include: { trainer: { select: { name: true } } } });
  const gender: Record<string, number> = {}, age: Record<string, number> = {}, trainer: Record<string, number> = {};
  const now = new Date();
  for (const m of members) {
    gender[m.gender ?? "Unknown"] = (gender[m.gender ?? "Unknown"] ?? 0) + 1;
    const a = m.dob ? Math.floor((now.getTime() - m.dob.getTime()) / 31_557_600_000) : null;
    const g = a == null ? "Unknown" : a < 18 ? "<18" : a < 26 ? "18–25" : a < 36 ? "26–35" : a < 46 ? "36–45" : "46+";
    age[g] = (age[g] ?? 0) + 1;
    const t = m.trainer?.name ?? "Unassigned"; trainer[t] = (trainer[t] ?? 0) + 1;
  }
  return { gender, age, trainer, total: members.length };
}

export async function planDistribution(db: TenantDb) {
  const rows = await db.memberMembership.groupBy({ by: ["planId"], where: { status: "ACTIVE" }, _count: true });
  const plans = await db.membershipPlan.findMany({ select: { id: true, name: true } });
  return rows.map((r) => ({ name: plans.find((p) => p.id === r.planId)?.name ?? "Unknown", count: r._count }));
}

/** Core business analytics for the owner. */
export async function analytics(db: TenantDb) {
  const today = startOfDay();
  const d30 = addDays(today, -30);
  const [active, total, collected, billed, expiring, renewed, ended, churned, memberships, att, newMembers] = await Promise.all([
    db.member.count({ where: { deletedAt: null, status: "ACTIVE" } }),
    db.member.count({ where: { deletedAt: null } }),
    db.payment.aggregate({ _sum: { finalAmount: true }, where: { status: "PAID", paidAt: { gte: d30 } } }),
    // Billed = collected in the window + dues that fell due in the window and are still unpaid.
    db.payment.aggregate({ _sum: { finalAmount: true }, where: { status: { in: ["PENDING", "OVERDUE"] }, dueDate: { gte: d30, lte: today } } }),
    db.memberMembership.count({ where: { endDate: { gte: d30, lt: today } } }),
    db.memberMembership.count({ where: { startDate: { gte: d30 }, member: { memberships: { some: { endDate: { gte: d30, lt: today } } } } } }),
    db.memberMembership.findMany({ where: { status: { in: ["ACTIVE", "EXPIRED"] } }, select: { startDate: true, endDate: true }, take: 500 }),
    db.member.count({ where: { deletedAt: null, status: "EXPIRED", updatedAt: { gte: d30 } } }),
    db.memberMembership.count({ where: { status: "ACTIVE" } }),
    db.attendance.count({ where: { checkInAt: { gte: d30 } } }),
    db.member.count({ where: { deletedAt: null, joinDate: { gte: d30 } } }),
  ]);
  const rev = collected._sum.finalAmount ?? 0;
  const bill = rev + (billed._sum.finalAmount ?? 0);
  const avgDays = ended.length ? ended.reduce((s, m) => s + (m.endDate.getTime() - m.startDate.getTime()) / 86_400_000, 0) / ended.length : 0;
  return {
    mrr: rev, arr: rev * 12, newMembers, churned,
    renewalRate: expiring ? Math.min(100, Math.round((renewed / expiring) * 100)) : null,
    arpm: active ? Math.round(rev / active) : 0,
    collectionRate: bill ? Math.round((rev / bill) * 100) : null,
    attendanceRate: active ? Math.round((att / (active * 30)) * 100) : 0,
    retention: total ? Math.round((active / total) * 100) : null,
    avgMembershipDays: Math.round(avgDays), memberships,
  };
}

export async function profitLoss(db: TenantDb, months = 12) {
  const [rev, exp] = await Promise.all([monthlyRevenue(db, months), monthlyExpenses(db, months)]);
  return rev.map((r, i) => ({ label: r.label, revenue: r.value, expenses: exp.monthly[i]!.value, profit: r.value - exp.monthly[i]!.value }));
}

export async function taxReport(db: TenantDb, from: Date, to: Date) {
  const rows = await db.invoice.findMany({ where: { issuedAt: { gte: from, lte: to } }, orderBy: { issuedAt: "asc" }, include: { member: { select: { firstName: true, lastName: true } } } });
  return rows;
}

export async function trainerCommission(db: TenantDb) {
  const trainers = await db.trainer.findMany({ where: { isActive: true }, include: { members: { where: { deletedAt: null }, select: { id: true } } } });
  const from = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const out = [];
  for (const t of trainers) {
    const sum = await db.payment.aggregate({ _sum: { finalAmount: true }, where: { status: "PAID", paidAt: { gte: from }, memberId: { in: t.members.map((m) => m.id) } } });
    const revenue = sum._sum.finalAmount ?? 0;
    out.push({ name: t.name, members: t.members.length, revenue, pct: Number(t.commissionPct ?? 0), commission: Math.round((revenue * Number(t.commissionPct ?? 0)) / 100) });
  }
  return out;
}

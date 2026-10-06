import type { TenantDb } from "@/server/db/tenant";

const startOfDay = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Overview numbers for the gym dashboard. All queries are tenant-locked by `db`. */
export async function getOverview(db: TenantDb) {
  const today = startOfDay();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const in7 = new Date(today.getTime() + 7 * 86_400_000);

  const [total, active, expired, checkins, collected, pending, renewals, newMembers] = await Promise.all([
    db.member.count({ where: { deletedAt: null } }),
    db.member.count({ where: { deletedAt: null, status: "ACTIVE" } }),
    db.member.count({ where: { deletedAt: null, status: "EXPIRED" } }),
    db.attendance.count({ where: { checkInAt: { gte: today } } }),
    db.payment.aggregate({ _sum: { finalAmount: true }, where: { status: "PAID", paidAt: { gte: monthStart } } }),
    db.payment.aggregate({ _sum: { finalAmount: true }, where: { status: { in: ["PENDING", "OVERDUE", "PARTIAL"] } } }),
    db.memberMembership.count({ where: { status: "ACTIVE", endDate: { gte: today, lte: in7 } } }),
    db.member.count({ where: { deletedAt: null, joinDate: { gte: monthStart } } }),
  ]);

  return {
    total, active, expired, checkins, renewals, newMembers,
    collected: collected._sum.finalAmount ?? 0,
    pending: pending._sum.finalAmount ?? 0,
  };
}

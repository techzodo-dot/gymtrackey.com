import type { TenantDb } from "@/server/db/tenant";

/** Onboarding progress derived from real data (no separate flags to drift out of sync). */
export async function getOnboarding(db: TenantDb) {
  const [gym, plans, members, payments, attendance, users] = await Promise.all([
    db.gym.findFirst(), db.membershipPlan.count(), db.member.count({ where: { deletedAt: null } }),
    db.payment.count({ where: { status: "PAID" } }), db.attendance.count(), db.user.count({ where: { role: { not: "OWNER" }, isActive: true } }),
  ]);
  const steps = [
    { key: "gym", label: "Add gym details", href: "/dashboard/settings", done: !!(gym?.address && gym?.phone) },
    { key: "plan", label: "Add a membership plan", href: "/dashboard/memberships", done: plans > 0 },
    { key: "member", label: "Add your first member", href: "/dashboard/members/new", done: members > 0 },
    { key: "payment", label: "Record your first payment", href: "/dashboard/payments/new", done: payments > 0 },
    { key: "attendance", label: "Set up attendance", href: "/dashboard/attendance", done: attendance > 0 },
    { key: "staff", label: "Invite staff", href: "/dashboard/staff", done: users > 0 },
  ];
  const done = steps.filter((s) => s.done).length;
  return { steps, percent: Math.round((done / steps.length) * 100), complete: done === steps.length };
}

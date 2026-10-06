import { redirect } from "next/navigation";
import Link from "next/link";
import { DashboardShell, NAV } from "@/components/dashboard/shell";
import { getAuth } from "@/server/auth/guard";
import { can } from "@/server/auth/permissions";
import { trialDaysLeft } from "@/server/services/registration";
import { getPlatformSettings } from "@/server/services/platform";
import { addDays, startOfDay } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuth();
  if (!ctx || !ctx.tenant) redirect("/login");

  const { user, tenant } = ctx;
  const items = NAV.filter((i) => !i.perm || can(user.role, user.permissions, i.perm));
  const days = trialDaysLeft(tenant.trialEndsAt);

  const [platform, overdue, renewals, tickets] = await Promise.all([
    getPlatformSettings(), ctx.db!.payment.count({ where: { status: { in: ["PENDING", "OVERDUE"] }, dueDate: { lt: startOfDay() } } }),
    ctx.db!.memberMembership.count({ where: { status: "ACTIVE", endDate: { gte: startOfDay(), lt: addDays(startOfDay(), 8) } } }), ctx.db!.supportTicket.count({ where: { status: { in: ["IN_PROGRESS", "RESOLVED"] } } }),
  ]);
  const badges = { "/dashboard/payments": { n: overdue + renewals, tone: overdue ? "bg-danger" : "bg-warn" }, "/dashboard/support": { n: tickets, tone: "bg-brand2" } };
  const notice = platform.maintenance ? "Scheduled maintenance may briefly affect GymTrackey." : platform.banner;

  let banner: React.ReactNode = null;
  if (tenant.isDemo) {
    banner = (
      <div role="status" className="gt-gradient-bg px-4 py-2 text-center text-sm font-semibold text-black">
        You&apos;re exploring the read-only demo. <Link href="/register" className="underline">Start your free trial</Link> to use GymTrackey with your own gym.
      </div>
    );
  } else if (ctx.readOnly) {
    banner = (
      <div role="alert" className="border-b border-danger/30 bg-danger/10 px-4 py-3 text-sm">
        <strong>Your GymTrackey {tenant.status === "TRIAL" ? "trial" : "subscription"} has expired.</strong> Your data is safe, but the account is read-only.{" "}
        <Link href="/dashboard/billing" className="font-semibold underline">Renew now</Link> · <Link href="/contact" className="underline">Contact support</Link>
      </div>
    );
  } else if (tenant.status === "TRIAL") {
    banner = (
      <div className="gt-gradient-bg px-4 py-2 text-center text-sm font-semibold text-black">
        Your trial ends in {days} day{days === 1 ? "" : "s"}. <Link href="/dashboard/billing" className="underline">Choose a plan</Link>
      </div>
    );
  }

  if (notice) banner = <>{banner}<div role="status" className="border-b border-line bg-surface2 px-4 py-2 text-center text-sm">{notice}</div></>;
  return <DashboardShell items={items} gymName={tenant.name} userName={user.name} banner={banner} badges={badges}>{children}</DashboardShell>;
}

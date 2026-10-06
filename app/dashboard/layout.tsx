import { redirect } from "next/navigation";
import Link from "next/link";
import { DashboardShell, NAV } from "@/components/dashboard/shell";
import { getAuth } from "@/server/auth/guard";
import { can } from "@/server/auth/permissions";
import { trialDaysLeft } from "@/server/services/registration";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuth();
  if (!ctx || !ctx.tenant) redirect("/login");

  const { user, tenant } = ctx;
  const items = NAV.filter((i) => !i.perm || can(user.role, user.permissions, i.perm));
  const days = trialDaysLeft(tenant.trialEndsAt);

  let banner: React.ReactNode = null;
  if (ctx.readOnly) {
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

  return <DashboardShell items={items} gymName={tenant.name} userName={user.name} banner={banner}>{children}</DashboardShell>;
}

import { pageAuth } from "@/server/auth/page";
import { prisma } from "@/server/db/prisma";
import { razorpayConfigured } from "@/server/services/billing";
import { usage } from "@/server/services/limits";
import { trialDaysLeft } from "@/server/services/registration";
import { Card } from "@/components/ui/card";
import { ConfirmForm } from "@/components/ui/confirm";
import { BillingCheckout } from "@/components/dashboard/billing-checkout";
import { Flash, PageHeader, StatusBadge, TableWrap, Td, Th } from "@/components/ui/page";
import { fmtDate } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { cancelSubscriptionAction } from "./actions";

export const metadata = { title: "Billing" };
const lim = (v: number | null, w: string) => (v == null ? `Unlimited ${w}` : `${v} ${w}`);

export default async function Billing({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const { db, tenant, user } = await pageAuth("billing");
  const [plans, history, u] = await Promise.all([
    prisma.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.subscription.findMany({ where: { tenantId: tenant.id, status: { not: "PENDING" } }, orderBy: { createdAt: "desc" }, include: { plan: true }, take: 20 }),
    usage(db),
  ]);
  const current = plans.find((p) => p.code === tenant.planCode);
  const active = history.find((h) => h.status === "ACTIVE");
  const order = plans.map((p) => p.code);
  const days = trialDaysLeft(tenant.trialEndsAt);

  return (
    <>
      <PageHeader title="Billing & subscription" /><Flash ok={sp.ok} error={sp.error} />
      <Card className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-xs text-muted">Current plan</p><p className="text-2xl font-black">{current?.name ?? tenant.planCode}</p>
            <p className="mt-1 text-sm text-muted">{tenant.status === "TRIAL" ? `Free trial — ${days} day(s) left (ends ${fmtDate(tenant.trialEndsAt)})` : active?.renewsAt ? `${tenant.status === "CANCELLED" ? "Access until" : "Next payment"}: ${fmtDate(active.renewsAt)}${active.amount ? ` · ${formatMoney(active.amount)}/month` : ""}` : "No active subscription"}</p></div>
          <StatusBadge status={tenant.status} />
        </div>
        <dl className="mt-5 grid grid-cols-3 gap-3 text-sm">
          {([["Members", u.members, current?.memberLimit], ["Branches", u.branches, current?.branchLimit], ["Staff", u.staff, current?.staffLimit]] as const).map(([k, used, limit]) => (
            <div key={k}><dt className="text-muted">{k}</dt><dd className="font-semibold">{used} / {limit ?? "∞"}</dd>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface2"><div className="gt-gradient-bg h-full" style={{ width: limit ? `${Math.min(100, (used / limit) * 100)}%` : "8%" }} /></div></div>))}
        </dl>
        {active && tenant.status === "ACTIVE" && user.role === "OWNER" && <div className="mt-4"><ConfirmForm action={cancelSubscriptionAction} title="Cancel subscription?" message="You keep access until the end of the paid period, then the account becomes read-only. Your data is never deleted." label="Cancel subscription" confirmLabel="Cancel subscription" /></div>}
      </Card>

      {!razorpayConfigured() && <p className="mb-4 rounded-xl bg-warn/10 px-4 py-3 text-sm text-warn">Online payments aren&apos;t configured on this server yet (set RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET). Checkout will be unavailable until then.</p>}
      <h2 className="mb-3 text-lg font-bold">{tenant.status === "EXPIRED" || tenant.status === "CANCELLED" ? "Renew your plan" : "Upgrade or change plan"}</h2>
      <BillingCheckout gymName={tenant.name} email={user.email} plans={plans.map((p) => ({
        code: p.code, name: p.name, custom: p.isCustom, priceLabel: p.isCustom ? "Custom" : `${formatMoney(p.priceMonthly)}/mo`, current: p.code === tenant.planCode && tenant.status === "ACTIVE",
        limits: `${lim(p.memberLimit, "members")} · ${lim(p.branchLimit, "branches")} · ${lim(p.staffLimit, "staff")}`,
        action: p.code === tenant.planCode ? (tenant.status === "ACTIVE" ? "Renew" : "Subscribe") : order.indexOf(p.code) > order.indexOf(tenant.planCode) ? "Upgrade" : "Downgrade" }))} />

      <h2 className="mb-3 mt-8 text-lg font-bold">Billing history</h2>
      {history.length === 0 ? <p className="text-sm text-muted">No payments yet.</p> : <TableWrap><thead><tr><Th>Date</Th><Th>Plan</Th><Th>Amount</Th><Th>Payment ID</Th><Th>Status</Th></tr></thead><tbody>
        {history.map((h) => <tr key={h.id}><Td>{fmtDate(h.createdAt)}</Td><Td>{h.plan.name}</Td><Td>{h.amount ? formatMoney(h.amount) : "—"}{h.discount ? <span className="text-xs text-muted"> (−{formatMoney(h.discount)} {h.couponCode})</span> : null}</Td><Td className="text-xs">{h.razorpayPaymentId ?? "—"}</Td><Td><StatusBadge status={h.status} /></Td></tr>)}</tbody></TableWrap>}
    </>
  );
}

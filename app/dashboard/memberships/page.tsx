import { pageAuth } from "@/server/auth/page";
import { PlanForm } from "@/components/dashboard/plan-form";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState, Flash, PageHeader, StatusBadge } from "@/components/ui/page";
import { formatMoney } from "@/lib/money";
import { createPlanAction, togglePlanAction, updatePlanAction } from "./actions";

export const metadata = { title: "Memberships" };

export default async function Memberships({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const { db } = await pageAuth("memberships");
  const plans = await db.membershipPlan.findMany({ orderBy: { durationDays: "asc" }, include: { _count: { select: { memberships: { where: { status: "ACTIVE" } } } } } });
  return (
    <>
      <PageHeader title="Membership plans" subtitle="Define what members can buy." />
      <Flash ok={sp.ok} error={sp.error} />
      {plans.length === 0 ? <EmptyState title="No membership plans yet." body="Create plans like Monthly, Quarterly, Annual or Student." /> : (
        <div className="mb-8 grid gap-4 md:grid-cols-2">
          {plans.map((p) => (
            <Card key={p.id}>
              <div className="flex items-start justify-between">
                <div><h2 className="text-lg font-bold">{p.name}</h2><p className="text-sm text-muted">{p.durationDays} days · {p.freezeDays} freeze days · {p._count.memberships} active</p></div>
                <div className="text-right"><p className="text-xl font-black">{formatMoney(p.price)}</p><StatusBadge status={p.isActive ? "ACTIVE" : "CANCELLED"} /></div>
              </div>
              {p.description && <p className="mt-2 text-sm text-muted">{p.description}</p>}
              <details className="mt-4"><summary className="cursor-pointer text-sm font-semibold text-brand">Edit plan</summary><div className="mt-4"><PlanForm action={updatePlanAction} plan={p} submit="Save changes" /></div></details>
              <form action={togglePlanAction} className="mt-3"><input type="hidden" name="id" value={p.id} /><Button variant="ghost" type="submit" className="px-0">{p.isActive ? "Deactivate" : "Activate"}</Button></form>
            </Card>
          ))}
        </div>
      )}
      <Card className="max-w-2xl"><h2 className="mb-4 text-lg font-bold">Add a plan</h2><PlanForm action={createPlanAction} submit="Create plan" /></Card>
    </>
  );
}

import { pageAuth } from "@/server/auth/page";
import { DietCard } from "@/components/dashboard/plan-cards";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, Flash, PageHeader } from "@/components/ui/page";
import { fullName } from "@/lib/format";

export const metadata = { title: "Diet plans" };

export default async function Diets({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const { db } = await pageAuth("diets", "diet");
  const plans = await db.dietPlan.findMany({ orderBy: { createdAt: "desc" }, take: 30, include: { meals: true, member: true } });
  return (
    <>
      <PageHeader title="Diet plans" actions={<ButtonLink href="/dashboard/diets/new">Create Diet Plan</ButtonLink>} />
      <Flash ok={sp.ok} error={sp.error} />
      {plans.length === 0 ? <EmptyState title="No diet plans yet." body="Plan meals with calories and macros for each member." action={<ButtonLink href="/dashboard/diets/new">Create Diet Plan</ButtonLink>} /> :
        <div className="space-y-4">{plans.map((p) => <div key={p.id}><p className="mb-1 text-xs font-semibold text-muted">{fullName(p.member)}</p><DietCard plan={p} /></div>)}</div>}
    </>
  );
}

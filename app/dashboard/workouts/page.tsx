import { pageAuth } from "@/server/auth/page";
import { WorkoutCard } from "@/components/dashboard/plan-cards";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, Flash, PageHeader } from "@/components/ui/page";
import { fullName } from "@/lib/format";

export const metadata = { title: "Workout plans" };

export default async function Workouts({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const { db } = await pageAuth("workouts", "trainers");
  const plans = await db.workoutPlan.findMany({ orderBy: { createdAt: "desc" }, take: 30, include: { exercises: { orderBy: { sortOrder: "asc" } }, trainer: true, member: true } });
  return (
    <>
      <PageHeader title="Workout plans" actions={<ButtonLink href="/dashboard/workouts/new">Create Workout</ButtonLink>} />
      <Flash ok={sp.ok} error={sp.error} />
      {plans.length === 0 ? <EmptyState title="No workout plans yet." body="Build a day-wise plan for a member and track completion." action={<ButtonLink href="/dashboard/workouts/new">Create Workout</ButtonLink>} /> :
        <div className="space-y-4">{plans.map((p) => <div key={p.id}><p className="mb-1 text-xs font-semibold text-muted">{fullName(p.member)}</p><WorkoutCard plan={p} back="/dashboard/workouts" /></div>)}</div>}
    </>
  );
}

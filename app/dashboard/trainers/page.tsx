import { pageAuth } from "@/server/auth/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormGrid, Input } from "@/components/ui/form";
import { EmptyState, Flash, PageHeader, StatusBadge } from "@/components/ui/page";
import { fmtDate } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { createTrainerAction, toggleTrainerAction } from "./actions";

export const metadata = { title: "Trainers" };

export default async function Trainers({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const { db } = await pageAuth("trainers", "trainers");
  const trainers = await db.trainer.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { members: { where: { deletedAt: null } }, workoutPlans: true } } } });
  return (
    <>
      <PageHeader title="Trainers" subtitle="Your coaching team." />
      <Flash ok={sp.ok} error={sp.error} />
      {trainers.length === 0 ? <EmptyState title="No trainers yet." body="Add trainers to assign members and build workout plans." /> : (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trainers.map((t) => (
            <Card key={t.id}>
              <div className="flex items-center gap-3"><div className="gt-gradient-bg grid h-12 w-12 place-items-center rounded-full font-black text-black">{t.name.split(" ").map((x) => x[0]).join("").slice(0, 2)}</div>
                <div className="min-w-0"><p className="truncate font-bold">{t.name}</p><p className="truncate text-sm text-muted">{t.specialization ?? "—"}</p></div><div className="ml-auto"><StatusBadge status={t.isActive ? "ACTIVE" : "CANCELLED"} /></div></div>
              <dl className="mt-4 grid grid-cols-2 gap-2 text-xs"><dt className="text-muted">Members</dt><dd className="text-right font-semibold">{t._count.members}</dd><dt className="text-muted">Workout plans</dt><dd className="text-right font-semibold">{t._count.workoutPlans}</dd>
                <dt className="text-muted">Joined</dt><dd className="text-right">{fmtDate(t.joinedAt)}</dd><dt className="text-muted">Commission</dt><dd className="text-right">{t.commissionPct ? `${t.commissionPct}%` : "—"}</dd>{t.salary ? <><dt className="text-muted">Salary</dt><dd className="text-right">{formatMoney(t.salary)}</dd></> : null}</dl>
              <form action={toggleTrainerAction} className="mt-3"><input type="hidden" name="id" value={t.id} /><Button variant="ghost" type="submit" className="px-0 text-xs">{t.isActive ? "Deactivate" : "Activate"}</Button></form>
            </Card>))}
        </div>
      )}
      <Card className="max-w-2xl"><h2 className="mb-4 text-lg font-bold">Add trainer</h2>
        <form action={createTrainerAction} className="space-y-4"><FormGrid>
          <Input label="Name *" name="name" required /><Input label="Specialization" name="specialization" /><Input label="Phone" name="phone" type="tel" /><Input label="Email" name="email" type="email" />
          <Input label="Joining date" name="joinedAt" type="date" /><Input label="Salary (₹/month)" name="salary" type="number" min={0} /><Input label="Commission %" name="commissionPct" type="number" step="0.1" min={0} max={100} />
        </FormGrid><Button type="submit">Add trainer</Button></form></Card>
    </>
  );
}

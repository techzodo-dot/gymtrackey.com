import { gymsByMonth, platformStats } from "@/server/services/platform";
import { prisma } from "@/server/db/prisma";
import { Card } from "@/components/ui/card";
import { BarChart, ShareBars } from "@/components/charts";
import { PageHeader, Stat } from "@/components/ui/page";
import { formatMoney } from "@/lib/money";

export const metadata = { title: "Super Admin" };

export default async function Admin() {
  const [s, growth, byPlan] = await Promise.all([platformStats(), gymsByMonth(6), prisma.tenant.groupBy({ by: ["planCode"], where: { isDemo: false }, _count: true })]);
  return (
    <>
      <PageHeader title="Platform overview" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total gyms" value={s.gyms} /><Stat label="Active gyms" value={s.active} tone="good" /><Stat label="Trial gyms" value={s.trial} tone="warn" /><Stat label="Expired gyms" value={s.expired} />
        <Stat label="Total members" value={s.members} /><Stat label="MRR" value={formatMoney(s.mrr)} /><Stat label="ARR" value={formatMoney(s.arr)} /><Stat label="Revenue collected" value={formatMoney(s.revenue)} />
        <Stat label="New registrations (30d)" value={s.newGyms} /><Stat label="Suspended" value={s.suspended} tone={s.suspended ? "bad" : undefined} /><Stat label="New leads" value={s.leads} /><Stat label="Open tickets" value={s.openTickets} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2"><Card><BarChart title="New gyms (6 months)" data={growth} /></Card><Card><ShareBars title="Gyms by plan" data={byPlan.map((p) => ({ name: p.planCode, value: p._count }))} /></Card></div>
    </>
  );
}

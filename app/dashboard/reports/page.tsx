import { pageAuth } from "@/server/auth/page";
import { analytics, attendanceTrend, memberStats, membershipGrowth, monthlyRevenue, planDistribution, profitLoss, trainerCommission } from "@/server/services/reports";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { BarChart, DualBars, LineChart, ShareBars } from "@/components/charts";
import { PageHeader, Stat, TableWrap, Td, Th } from "@/components/ui/page";
import { PrintButton } from "@/components/print-button";
import { formatMoney } from "@/lib/money";

export const metadata = { title: "Reports" };

export default async function Reports() {
  const { db } = await pageAuth("reports");
  const [a, rev, pl, growth, att, stats, plans, comm, pendingAgg, overdue] = await Promise.all([
    analytics(db), monthlyRevenue(db, 12), profitLoss(db, 6), membershipGrowth(db, 12), attendanceTrend(db, 30), memberStats(db), planDistribution(db), trainerCommission(db),
    db.payment.aggregate({ _sum: { finalAmount: true }, where: { status: { in: ["PENDING", "OVERDUE"] } } }), db.payment.count({ where: { status: "OVERDUE" } }),
  ]);
  const pct = (v: number | null) => (v == null ? "—" : `${v}%`);
  const totalProfit = pl.reduce((s, r) => s + r.profit, 0);
  return (
    <>
      <PageHeader title="Reports & analytics" subtitle="Last 30 days unless stated." actions={<>
        <ButtonLink href="/api/export/revenue" variant="secondary">Revenue CSV</ButtonLink><ButtonLink href="/api/export/payments" variant="secondary">Payments CSV</ButtonLink><ButtonLink href="/api/export/tax" variant="secondary">Tax CSV</ButtonLink><PrintButton label="Print / PDF" /></>} />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Revenue (30d)" value={formatMoney(a.mrr)} /><Stat label="Annualised (ARR)" value={formatMoney(a.arr)} /><Stat label="New members" value={a.newMembers} tone="good" /><Stat label="Churned" value={a.churned} tone={a.churned ? "warn" : undefined} />
        <Stat label="Renewal rate" value={pct(a.renewalRate)} /><Stat label="Collection rate" value={pct(a.collectionRate)} /><Stat label="Avg revenue / member" value={formatMoney(a.arpm)} /><Stat label="Attendance rate" value={`${a.attendanceRate}%`} />
        <Stat label="Retention" value={pct(a.retention)} /><Stat label="Avg membership" value={`${a.avgMembershipDays} days`} /><Stat label="Outstanding fees" value={formatMoney(pendingAgg._sum.finalAmount ?? 0)} tone="warn" /><Stat label="Overdue payments" value={overdue} tone={overdue ? "bad" : undefined} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><BarChart title="Monthly revenue (12 months)" data={rev} money /></Card>
        <Card><DualBars title={`Profit / loss (6 months) — net ${formatMoney(totalProfit)}`} data={pl.map((r) => ({ label: r.label, a: r.revenue, b: r.expenses }))} /></Card>
        <Card><BarChart title="New members by month" data={growth} /></Card>
        <Card><LineChart title="Daily check-ins (30 days)" data={att} /></Card>
        <Card><ShareBars title="Membership plan distribution" data={plans.map((p) => ({ name: p.name, value: p.count }))} /></Card>
        <Card><ShareBars title="Gender" data={Object.entries(stats.gender).map(([name, value]) => ({ name, value }))} /></Card>
        <Card><ShareBars title="Age groups" data={Object.entries(stats.age).map(([name, value]) => ({ name, value }))} /></Card>
        <Card><ShareBars title="Members per trainer" data={Object.entries(stats.trainer).map(([name, value]) => ({ name, value }))} /></Card>
      </div>
      <h2 className="mb-3 mt-8 text-lg font-bold">Trainer commission (this month)</h2>
      <TableWrap><thead><tr><Th>Trainer</Th><Th>Members</Th><Th>Revenue from members</Th><Th>Rate</Th><Th>Commission</Th></tr></thead><tbody>
        {comm.map((c) => <tr key={c.name}><Td>{c.name}</Td><Td>{c.members}</Td><Td>{formatMoney(c.revenue)}</Td><Td>{c.pct}%</Td><Td className="font-semibold">{formatMoney(c.commission)}</Td></tr>)}</tbody></TableWrap>
    </>
  );
}

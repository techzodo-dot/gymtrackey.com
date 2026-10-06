import Link from "next/link";
import { pageAuth } from "@/server/auth/page";
import { getOverview } from "@/server/services/dashboard";
import { getOnboarding } from "@/server/services/onboarding";
import { attendanceTrend, membershipGrowth, monthlyExpenses, monthlyRevenue } from "@/server/services/reports";
import { inactiveMembers, upcomingBirthdays } from "@/server/services/attendance";
import { getDues } from "@/server/services/payments";
import { Card } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { BarChart, DualBars, LineChart } from "@/components/charts";
import { Flash, Stat } from "@/components/ui/page";
import { formatMoney } from "@/lib/money";
import { fullName } from "@/lib/format";
import { trialDaysLeft } from "@/server/services/registration";
import { loadSampleDataAction } from "./onboarding-actions";

export const metadata = { title: "Dashboard" };

export default async function DashboardHome({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const { db, user, tenant } = await pageAuth();
  const [o, ob, rev, growth, att, exp, dues, inactive, bdays] = await Promise.all([
    getOverview(db), getOnboarding(db), monthlyRevenue(db, 12), membershipGrowth(db, 12), attendanceTrend(db, 30), monthlyExpenses(db, 6), getDues(db), inactiveMembers(db, 14), upcomingBirthdays(db, 7),
  ]);
  const overdueCount = dues.overdue.length + dues.pending.filter((p) => p.dueDate && p.dueDate < new Date()).length;
  const rev6 = rev.slice(-6);

  const alerts: { text: string; href: string }[] = [];
  if (o.renewals) alerts.push({ text: `${o.renewals} membership${o.renewals > 1 ? "s" : ""} expire this week.`, href: "/dashboard/payments" });
  if (o.pending) alerts.push({ text: `${formatMoney(o.pending)} pending fees.`, href: "/dashboard/payments" });
  if (overdueCount) alerts.push({ text: `${overdueCount} member${overdueCount > 1 ? "s have" : " has"} overdue payments.`, href: "/dashboard/payments" });
  if (inactive.length) alerts.push({ text: `${inactive.length} members haven't visited in 14+ days.`, href: "/dashboard/attendance" });
  if (tenant.status === "TRIAL") alerts.push({ text: `Your GymTrackey trial ends in ${trialDaysLeft(tenant.trialEndsAt)} days.`, href: "/dashboard/billing" });

  const quick = [["Add Member", "/dashboard/members/new"], ["Collect Payment", "/dashboard/payments/new"], ["Check Attendance", "/dashboard/attendance"], ["Add Membership", "/dashboard/memberships"], ["Add Expense", "/dashboard/expenses"], ["Add Trainer", "/dashboard/trainers"], ["Create Workout", "/dashboard/workouts/new"]];

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Hi {user.name.split(" ")[0]} 👋</h1><p className="text-sm text-muted">Here&apos;s how {tenant.name} is doing.</p></div>
      <Flash ok={sp.ok} error={sp.error} />

      {!ob.complete && (
        <Card>
          <div className="mb-3 flex items-center justify-between"><h2 className="font-bold">Get started</h2><span className="text-sm font-semibold text-brand">{ob.percent}%</span></div>
          <div className="mb-4 h-2 overflow-hidden rounded-full bg-surface2" role="progressbar" aria-valuenow={ob.percent} aria-valuemin={0} aria-valuemax={100} aria-label="Onboarding progress"><div className="gt-gradient-bg h-full transition-all" style={{ width: `${ob.percent}%` }} /></div>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{ob.steps.map((s) => <li key={s.key}><Link href={s.href} className="flex items-center gap-2 text-sm hover:text-brand"><span className={`grid h-5 w-5 place-items-center rounded-full text-[11px] ${s.done ? "gt-gradient-bg text-black" : "border border-line text-transparent"}`}>✓</span><span className={s.done ? "text-muted line-through" : ""}>{s.label}</span></Link></li>)}</ul>
          {o.total === 0 && <form action={loadSampleDataAction} className="mt-4 border-t border-line pt-4"><p className="mb-2 text-sm text-muted">Want to explore first? Fill your gym with realistic sample data (you can only do this while it&apos;s empty).</p><Button variant="secondary" type="submit">Load sample data</Button></form>}
        </Card>
      )}

      {alerts.length > 0 && <Card className="space-y-1.5 border-warn/40 bg-warn/5 p-4 text-sm" role="status">{alerts.map((a) => <p key={a.text}>⚠️ <Link className="hover:underline" href={a.href}>{a.text}</Link></p>)}</Card>}

      <div className="flex flex-wrap gap-2">{quick.map(([l, h], i) => <ButtonLink key={l} href={h!} variant={i < 2 ? "primary" : "secondary"} className="px-4 py-2">{l}</ButtonLink>)}</div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total members" value={o.total} /><Stat label="Active members" value={o.active} tone="good" /><Stat label="Expired members" value={o.expired} tone={o.expired ? "warn" : undefined} /><Stat label="Today's attendance" value={o.checkins} />
        <Stat label="Fees collected (month)" value={formatMoney(o.collected)} /><Stat label="Pending fees" value={formatMoney(o.pending)} tone={o.pending ? "warn" : undefined} /><Stat label="Upcoming renewals (7d)" value={o.renewals} /><Stat label="New members (month)" value={o.newMembers} />
      </div>

      {o.total === 0 ? (
        <Card className="text-center"><h2 className="text-lg font-bold">No members yet.</h2><p className="mx-auto mt-1 max-w-md text-sm text-muted">Add your first member to start tracking memberships, fees and attendance.</p><ButtonLink href="/dashboard/members/new" className="mt-4">Add Your First Member</ButtonLink></Card>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card><BarChart title="Monthly revenue" data={rev} money /></Card>
            <Card><DualBars title="Revenue vs expenses" data={rev6.map((r, i) => ({ label: r.label, a: r.value, b: exp.monthly.slice(-6)[i]?.value ?? 0 }))} /></Card>
            <Card><BarChart title="Membership growth (new members)" data={growth} /></Card>
            <Card><LineChart title="Attendance trend (30 days)" data={att} /></Card>
          </div>
          {bdays.length > 0 && <Card><h2 className="mb-2 font-bold">🎂 Birthdays this week</h2><p className="text-sm">{bdays.map((b) => `${fullName(b)}${b.inDays === 0 ? " (today)" : ""}`).join(" · ")}</p></Card>}
        </>
      )}
    </div>
  );
}

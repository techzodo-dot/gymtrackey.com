import Link from "next/link";
import { requireAuth } from "@/server/auth/guard";
import { getOverview } from "@/server/services/dashboard";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";

export const metadata = { title: "Dashboard" };

export default async function DashboardHome() {
  const { db, user } = await requireAuth();
  const o = db ? await getOverview(db) : null;
  if (!o) return null;

  const cards: [string, string][] = [
    ["Total members", String(o.total)], ["Active members", String(o.active)], ["Expired members", String(o.expired)],
    ["Today's attendance", String(o.checkins)], ["Fees collected (this month)", formatMoney(o.collected)],
    ["Pending fees", formatMoney(o.pending)], ["Renewals due (7 days)", String(o.renewals)], ["New members (this month)", String(o.newMembers)],
  ];
  const alerts: string[] = [];
  if (o.renewals) alerts.push(`${o.renewals} membership${o.renewals > 1 ? "s" : ""} expire this week.`);
  if (o.pending) alerts.push(`${formatMoney(o.pending)} pending fees.`);

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Hi {user.name.split(" ")[0]} 👋</h1><p className="text-sm text-muted">Here&apos;s how your gym is doing.</p></div>
      {alerts.length > 0 && (
        <Card className="space-y-1 border-warn/40 bg-warn/5 p-4 text-sm" role="status">{alerts.map((a) => <p key={a}>⚠️ {a}</p>)}</Card>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(([l, v]) => <Card key={l} className="p-4"><p className="text-xs text-muted">{l}</p><p className="mt-1 text-2xl font-bold">{v}</p></Card>)}
      </div>
      {o.total === 0 && (
        <Card className="text-center">
          <h2 className="text-lg font-bold">No members yet.</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">Add your first member to start tracking memberships, fees and attendance.</p>
          <Link href="/dashboard/members" className="gt-gradient-bg mt-4 inline-flex rounded-xl px-5 py-2.5 text-sm font-semibold text-black">Add Your First Member</Link>
        </Card>
      )}
    </div>
  );
}

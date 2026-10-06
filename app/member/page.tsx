import Link from "next/link";
import QRCode from "qrcode";
import { getAuth } from "@/server/auth/guard";
import { redirect } from "next/navigation";
import { Card, Badge } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/page";
import { LineChart } from "@/components/charts";
import { WorkoutCard, DietCard } from "@/components/dashboard/plan-cards";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata = { title: "My membership" };

export default async function MemberHome() {
  const ctx = await getAuth();
  if (!ctx?.db || ctx.user.role !== "MEMBER") redirect("/login");
  // The member record is resolved from the SESSION user, never from request input — a member can only ever see their own data.
  const me = await ctx.db.member.findFirst({ where: { userId: ctx.user.id, deletedAt: null }, include: { memberships: { orderBy: { endDate: "desc" }, take: 1, include: { plan: true } } } });
  if (!me) return <Card>Your account isn&apos;t linked to a member profile yet. Please contact the gym.</Card>;
  const db = ctx.db;
  const [payments, attendance, workouts, diets, measurements, notifications, pending] = await Promise.all([
    db.payment.findMany({ where: { memberId: me.id }, orderBy: { createdAt: "desc" }, take: 10, include: { invoice: true } }),
    db.attendance.findMany({ where: { memberId: me.id }, orderBy: { checkInAt: "desc" }, take: 8 }),
    db.workoutPlan.findMany({ where: { memberId: me.id }, orderBy: { createdAt: "desc" }, take: 1, include: { exercises: { orderBy: { sortOrder: "asc" } }, trainer: true } }),
    db.dietPlan.findMany({ where: { memberId: me.id }, orderBy: { createdAt: "desc" }, take: 1, include: { meals: true } }),
    db.measurement.findMany({ where: { memberId: me.id, weightKg: { not: null } }, orderBy: { measuredAt: "asc" } }),
    db.notification.findMany({ where: { memberId: me.id }, orderBy: { createdAt: "desc" }, take: 6 }),
    db.payment.aggregate({ _sum: { finalAmount: true }, where: { memberId: me.id, status: { in: ["PENDING", "OVERDUE"] } } }),
  ]);
  const cur = me.memberships[0];
  const days = cur ? Math.ceil((cur.endDate.getTime() - Date.now()) / 86_400_000) : 0;
  const qr = await QRCode.toString(me.qrToken, { type: "svg", margin: 1, width: 150 });
  const owed = pending._sum.finalAmount ?? 0;

  return (
    <div className="space-y-4">
      <Card><p className="text-sm text-muted">{ctx.tenant?.name}</p><h1 className="text-2xl font-bold">Hi {me.firstName} 👋</h1><p className="text-xs text-muted">{me.memberCode}</p>
        {cur ? <p className="mt-3 text-sm"><b>{cur.plan.name}</b> · valid till {fmtDate(cur.endDate)} <StatusBadge status={cur.status} />{cur.status === "ACTIVE" && <span className={days <= 7 ? "ml-2 text-warn" : "ml-2 text-muted"}>({days} day{days === 1 ? "" : "s"} left)</span>}</p> : <p className="mt-3 text-sm text-muted">No active membership.</p>}</Card>
      {owed > 0 && <Card className="border-warn/40 bg-warn/5 p-4 text-sm">You have <b>{formatMoney(owed)}</b> pending. Please pay at the front desk.</Card>}
      <Card className="flex items-center gap-4"><div className="shrink-0 rounded-lg bg-white p-1" dangerouslySetInnerHTML={{ __html: qr }} role="img" aria-label="Your check-in QR code" /><div><h2 className="font-bold">Check-in QR</h2><p className="text-sm text-muted">Show this at reception to check in.</p></div></Card>
      {notifications.length > 0 && <Card><h2 className="mb-2 font-bold">Notifications</h2><ul className="space-y-2 text-sm">{notifications.map((n) => <li key={n.id}><b>{n.title}</b><p className="text-muted">{n.body}</p></li>)}</ul></Card>}
      {workouts[0] && <WorkoutCard plan={workouts[0]} back="/member" readOnly />}
      {diets[0] && <DietCard plan={diets[0]} />}
      {measurements.length > 1 && <Card><LineChart title="My weight (kg)" data={measurements.map((m) => ({ label: fmtDate(m.measuredAt), value: Number(m.weightKg) }))} /></Card>}
      <Card><h2 className="mb-2 font-bold">Payments & receipts</h2>{payments.length === 0 ? <p className="text-sm text-muted">No payments yet.</p> : <ul className="divide-y divide-line text-sm">{payments.map((p) => <li key={p.id} className="flex items-center justify-between gap-2 py-2"><span>{fmtDate(p.paidAt ?? p.dueDate)} · {formatMoney(p.finalAmount)} <Badge>{p.status}</Badge></span>{p.invoice && <Link className="text-brand underline" href={`/member/receipts/${p.id}`}>Receipt</Link>}</li>)}</ul>}</Card>
      <Card><h2 className="mb-2 font-bold">Recent visits</h2>{attendance.length === 0 ? <p className="text-sm text-muted">No check-ins yet.</p> : <ul className="text-sm text-muted">{attendance.map((a) => <li key={a.id}>{fmtDateTime(a.checkInAt)}</li>)}</ul>}</Card>
    </div>
  );
}

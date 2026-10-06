import { notFound } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmForm } from "@/components/ui/confirm";
import { Input, Select } from "@/components/ui/form";
import { Flash, PageHeader, Stat, StatusBadge, TableWrap, Td, Th } from "@/components/ui/page";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { activateGymAction, changePlanAction, extendTrialAction, suspendGymAction } from "../../actions";

export default async function GymDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const t = await prisma.tenant.findUnique({ where: { id }, include: { gym: true, users: { where: { role: "OWNER" } }, subscriptions: { orderBy: { createdAt: "desc" }, include: { plan: true }, take: 10 } } });
  if (!t) notFound();
  const [members, staff, payments, revenue, plans, audit] = await Promise.all([
    prisma.member.count({ where: { tenantId: id } }), prisma.user.count({ where: { tenantId: id, role: { not: "MEMBER" } } }), prisma.payment.count({ where: { tenantId: id } }),
    prisma.payment.aggregate({ _sum: { finalAmount: true }, where: { tenantId: id, status: "PAID" } }), prisma.subscriptionPlan.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.auditLog.findMany({ where: { tenantId: id }, orderBy: { createdAt: "desc" }, take: 8 }),
  ]);
  return (
    <div className="max-w-5xl">
      <PageHeader title={t.name} subtitle={`${t.gym?.city ?? ""} · ${t.users[0]?.email ?? ""} · joined ${fmtDate(t.createdAt)}`} actions={<StatusBadge status={t.status} />} /><Flash ok={sp.ok} error={sp.error} />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5"><Stat label="Plan" value={t.planCode} /><Stat label="Members" value={members} /><Stat label="Staff" value={staff} /><Stat label="Payments" value={payments} /><Stat label="Member revenue" value={formatMoney(revenue._sum.finalAmount ?? 0)} /></div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><h2 className="mb-3 font-bold">Actions</h2><div className="space-y-4">
          {t.trialEndsAt && <p className="text-sm text-muted">Trial ends {fmtDate(t.trialEndsAt)}</p>}
          <form action={extendTrialAction} className="flex items-end gap-2"><input type="hidden" name="id" value={t.id} /><Input label="Extend trial (days)" name="days" type="number" min={1} max={365} defaultValue={7} wrap="w-40" /><Button variant="secondary" type="submit">Extend</Button></form>
          <form action={changePlanAction} className="flex items-end gap-2"><input type="hidden" name="id" value={t.id} /><Select label="Change plan" name="planCode" defaultValue={t.planCode} options={plans.map((p) => [p.code, p.name])} wrap="w-56" /><Button variant="secondary" type="submit">Apply</Button></form>
          <div className="flex gap-2">{t.status === "SUSPENDED" ? <form action={activateGymAction}><input type="hidden" name="id" value={t.id} /><Button type="submit">Activate gym</Button></form>
            : <ConfirmForm action={suspendGymAction} title={`Suspend ${t.name}?`} message="Their users will be unable to sign in until you re-activate the gym. No data is deleted." label="Suspend gym" confirmLabel="Suspend"><input type="hidden" name="id" value={t.id} /></ConfirmForm>}</div></div></Card>
        <Card className="p-0"><h2 className="border-b border-line px-5 py-3 font-bold">Recent activity</h2>{audit.length === 0 ? <p className="p-5 text-sm text-muted">No activity.</p> : <ul className="divide-y divide-line text-sm">{audit.map((a) => <li key={a.id} className="flex justify-between px-5 py-2"><span>{a.action}</span><span className="text-xs text-muted">{fmtDateTime(a.createdAt)}</span></li>)}</ul>}</Card>
      </div>
      <h2 className="mb-3 mt-6 text-lg font-bold">Subscription history</h2>
      <TableWrap><thead><tr><Th>Date</Th><Th>Plan</Th><Th>Amount</Th><Th>Renews</Th><Th>Payment ID</Th><Th>Status</Th></tr></thead><tbody>{t.subscriptions.map((s) => <tr key={s.id}><Td>{fmtDate(s.createdAt)}</Td><Td>{s.plan.name}</Td><Td>{formatMoney(s.amount)}</Td><Td>{fmtDate(s.renewsAt)}</Td><Td className="text-xs">{s.razorpayPaymentId ?? "—"}</Td><Td><StatusBadge status={s.status} /></Td></tr>)}</tbody></TableWrap>
    </div>
  );
}

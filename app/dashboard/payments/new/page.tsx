import Link from "next/link";
import { pageAuth } from "@/server/auth/page";
import { METHODS } from "@/server/services/payments";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormGrid, Input, Select, Textarea } from "@/components/ui/form";
import { EmptyState, Flash, PageHeader, SearchBar, StatusBadge } from "@/components/ui/page";
import { fmtDate, fullName, isoDate, addDays } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { collectAction } from "../actions";

export const metadata = { title: "Collect payment" };

export default async function CollectPayment({ searchParams }: { searchParams: Promise<{ member?: string; plan?: string; payment?: string; q?: string; error?: string }> }) {
  const sp = await searchParams;
  const { db } = await pageAuth("payments");

  if (!sp.member) {
    const results = sp.q ? await db.member.findMany({ where: { deletedAt: null, OR: [{ firstName: { contains: sp.q, mode: "insensitive" } }, { lastName: { contains: sp.q, mode: "insensitive" } }, { phone: { contains: sp.q } }, { memberCode: { contains: sp.q, mode: "insensitive" } }] }, take: 10 }) : [];
    return (
      <div className="max-w-2xl">
        <PageHeader title="Collect payment" subtitle="Step 1 — select the member." />
        <SearchBar action="/dashboard/payments/new" q={sp.q} placeholder="Search member by name, phone or ID" />
        {sp.q && results.length === 0 && <EmptyState title="No member found." body="Check the spelling or add the member first." action={<Link className="text-brand underline" href="/dashboard/members/new">Add member</Link>} />}
        <ul className="space-y-2">{results.map((m) => <li key={m.id}><Link href={`/dashboard/payments/new?member=${m.id}`} className="flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3 hover:bg-surface2"><span><b>{fullName(m)}</b> <span className="text-sm text-muted">{m.memberCode} · {m.phone}</span></span><StatusBadge status={m.status} /></Link></li>)}</ul>
      </div>
    );
  }

  const member = await db.member.findFirst({ where: { id: sp.member, deletedAt: null }, include: { memberships: { orderBy: { endDate: "desc" }, take: 1, include: { plan: true } } } });
  if (!member) return <EmptyState title="Member not found." />;
  const [plans, pending, outstanding] = await Promise.all([
    db.membershipPlan.findMany({ where: { isActive: true } }),
    sp.payment ? db.payment.findFirst({ where: { id: sp.payment, memberId: member.id, status: { in: ["PENDING", "OVERDUE"] } } }) : null,
    db.payment.aggregate({ _sum: { finalAmount: true }, where: { memberId: member.id, status: { in: ["PENDING", "OVERDUE"] } } }),
  ]);
  const cur = member.memberships[0];
  const preselect = sp.plan ? (await db.memberMembership.findFirst({ where: { id: sp.plan } }))?.planId : cur?.planId;

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader title="Collect payment" subtitle={`${fullName(member)} · ${member.memberCode}`} />
      <Flash error={sp.error} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="p-4 text-sm"><p className="text-xs text-muted">Current membership</p>{cur ? <p className="mt-1 font-semibold">{cur.plan.name} · till {fmtDate(cur.endDate)} <StatusBadge status={cur.status} /></p> : <p className="mt-1">None</p>}</Card>
        <Card className="p-4 text-sm"><p className="text-xs text-muted">Outstanding balance</p><p className="mt-1 text-xl font-bold text-warn">{formatMoney(outstanding._sum.finalAmount ?? 0)}</p></Card>
      </div>
      <Card>
        <form action={collectAction} className="space-y-4">
          <input type="hidden" name="memberId" value={member.id} />
          {pending && <input type="hidden" name="paymentId" value={pending.id} />}
          <FormGrid>
            {!pending && <Select label="Membership plan (renews / starts)" name="planId" placeholder="Payment only — no membership change" defaultValue={preselect ?? ""} options={plans.map((p) => [p.id, `${p.name} — ${formatMoney(p.price)}`])} />}
            <Input label="Amount (₹) *" name="amount" type="number" step="0.01" min="0" required defaultValue={pending ? pending.amount / 100 : (plans.find((p) => p.id === preselect)?.price ?? 0) / 100} hint="Before tax. GST is added per your settings." />
            <Input label="Discount (₹)" name="discount" type="number" step="0.01" min="0" defaultValue={pending ? pending.discount / 100 : 0} />
            <Select label="Payment method" name="method" options={METHODS.map((m) => [m, m.replace("_", " ")])} defaultValue={pending?.method} />
            <Input label="Payment date" name="paidAt" type="date" defaultValue={isoDate(new Date())} />
            {!pending && <Select label="Status" name="status" options={[["PAID", "Paid now"], ["PENDING", "Record as due (collect later)"]]} />}
            {!pending && <Input label="Due date (if recording a due)" name="dueDate" type="date" defaultValue={isoDate(addDays(new Date(), 7))} />}
          </FormGrid>
          <Textarea label="Notes" name="notes" defaultValue={pending?.notes ?? ""} />
          <Button type="submit">Collect Payment</Button>
        </form>
      </Card>
    </div>
  );
}

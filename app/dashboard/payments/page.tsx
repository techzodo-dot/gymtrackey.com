import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { pageAuth } from "@/server/auth/page";
import { getDues } from "@/server/services/payments";
import { Card } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState, Flash, PageHeader, Pagination, SearchBar, Stat, StatusBadge, TableWrap, Td, Th } from "@/components/ui/page";
import { selectClass } from "@/components/ui/form";
import { addDays, fmtDate, fullName, startOfDay } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { sendReminderAction } from "../members/actions";

export const metadata = { title: "Payments" };
type SP = { q?: string; status?: string; method?: string; from?: string; to?: string; page?: string; ok?: string; error?: string };
const PAGE = 20;

type DueRow = { id: string; memberId: string; endDate: Date; member: { firstName: string; lastName: string | null }; plan: { name: string; price: number } };
function DueSection({ title, rows, tone }: { title: string; rows: DueRow[]; tone?: string }) {
  if (!rows.length) return null;
  return (
    <Card className="p-0">
      <h3 className={`border-b border-line px-5 py-3 text-sm font-bold ${tone ?? ""}`}>{title} <span className="font-normal text-muted">({rows.length})</span></h3>
      <ul className="divide-y divide-line">
        {rows.slice(0, 8).map((m) => (
          <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
            <div><p className="font-semibold">{fullName(m.member)}</p><p className="text-xs text-muted">{m.plan.name} · {formatMoney(m.plan.price)} · Due {fmtDate(m.endDate)}</p></div>
            <div className="flex flex-wrap gap-2">
              <ButtonLink href={`/dashboard/payments/new?member=${m.memberId}&plan=${m.id}`} className="px-3 py-1.5">Collect Payment</ButtonLink>
              <form action={sendReminderAction}><input type="hidden" name="id" value={m.memberId} /><input type="hidden" name="back" value="/dashboard/payments" /><Button variant="secondary" className="px-3 py-1.5" type="submit">Send Reminder</Button></form>
              <ButtonLink href={`/dashboard/members/${m.memberId}`} variant="ghost" className="px-3 py-1.5">View Member</ButtonLink>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default async function Payments({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { db } = await pageAuth("payments");
  const today = startOfDay(), monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const where: Prisma.PaymentWhereInput = {};
  if (sp.status) where.status = sp.status as never;
  if (sp.method) where.method = sp.method as never;
  if (sp.from || sp.to) where.paidAt = { ...(sp.from ? { gte: new Date(sp.from) } : {}), ...(sp.to ? { lt: addDays(new Date(sp.to), 1) } : {}) };
  if (sp.q) where.OR = [{ member: { firstName: { contains: sp.q, mode: "insensitive" } } }, { member: { lastName: { contains: sp.q, mode: "insensitive" } } }, { member: { phone: { contains: sp.q } } }, { invoice: { number: { contains: sp.q, mode: "insensitive" } } }];
  const page = Math.max(1, Number(sp.page) || 1);

  const [total, todayAgg, monthAgg, pendingAgg, dues, rows, count] = await Promise.all([
    db.payment.aggregate({ _sum: { finalAmount: true }, where: { status: "PAID" } }),
    db.payment.aggregate({ _sum: { finalAmount: true }, where: { status: "PAID", paidAt: { gte: today } } }),
    db.payment.aggregate({ _sum: { finalAmount: true }, where: { status: "PAID", paidAt: { gte: monthStart } } }),
    db.payment.aggregate({ _sum: { finalAmount: true }, where: { status: { in: ["PENDING", "OVERDUE"] } } }),
    getDues(db),
    db.payment.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE, include: { member: true, invoice: true } }),
    db.payment.count({ where }),
  ]);
  const params = { q: sp.q, status: sp.status, method: sp.method, from: sp.from, to: sp.to };

  return (
    <>
      <PageHeader title="Payments" subtitle="Collect fees, track dues and issue receipts." actions={<><ButtonLink href="/api/export/payments" variant="secondary">Export CSV</ButtonLink><ButtonLink href="/dashboard/payments/new">Collect Payment</ButtonLink></>} />
      <Flash ok={sp.ok} error={sp.error} />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Stat label="Total collected" value={formatMoney(total._sum.finalAmount ?? 0)} />
        <Stat label="Today" value={formatMoney(todayAgg._sum.finalAmount ?? 0)} tone="good" />
        <Stat label="This month" value={formatMoney(monthAgg._sum.finalAmount ?? 0)} />
        <Stat label="Pending fees" value={formatMoney(pendingAgg._sum.finalAmount ?? 0)} tone="warn" sub={`${dues.pending.length} open`} />
        <Stat label="Overdue" value={dues.overdue.length} tone={dues.overdue.length ? "bad" : undefined} sub="lapsed, not renewed" />
        <Stat label="Due this week" value={dues.dueToday.length + dues.dueTomorrow.length + dues.dueWeek.length} />
      </div>

      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <DueSection title="Due today" rows={dues.dueToday} tone="text-warn" />
        <DueSection title="Due tomorrow" rows={dues.dueTomorrow} />
        <DueSection title="Due this week" rows={dues.dueWeek} />
        <DueSection title="Overdue" rows={dues.overdue} tone="text-danger" />
        {dues.pending.length > 0 && (
          <Card className="p-0">
            <h3 className="border-b border-line px-5 py-3 text-sm font-bold">Pending payments <span className="font-normal text-muted">({dues.pending.length})</span></h3>
            <ul className="divide-y divide-line">{dues.pending.slice(0, 8).map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                <div><p className="font-semibold">{fullName(p.member)}</p><p className="text-xs text-muted">{formatMoney(p.finalAmount)} · Due {fmtDate(p.dueDate)}</p></div>
                <ButtonLink href={`/dashboard/payments/new?member=${p.memberId}&payment=${p.id}`} className="px-3 py-1.5">Collect Payment</ButtonLink>
              </li>))}</ul>
          </Card>
        )}
      </div>

      <h2 className="mb-3 text-lg font-bold">All payments</h2>
      <SearchBar action="/dashboard/payments" q={sp.q} placeholder="Member, phone or invoice number">
        <select name="status" defaultValue={sp.status ?? ""} aria-label="Status" className={`${selectClass} w-auto`}><option value="">All statuses</option>{["PAID", "PENDING", "OVERDUE", "REFUNDED"].map((s) => <option key={s}>{s}</option>)}</select>
        <select name="method" defaultValue={sp.method ?? ""} aria-label="Method" className={`${selectClass} w-auto`}><option value="">All methods</option>{["CASH", "UPI", "CARD", "BANK_TRANSFER", "CHEQUE", "ONLINE"].map((s) => <option key={s}>{s}</option>)}</select>
        <input type="date" name="from" defaultValue={sp.from} aria-label="From date" className={`${selectClass} w-auto`} /><input type="date" name="to" defaultValue={sp.to} aria-label="To date" className={`${selectClass} w-auto`} />
      </SearchBar>
      {rows.length === 0 ? <EmptyState title="No payments found." body="Collected payments and their invoices will appear here." action={<ButtonLink href="/dashboard/payments/new">Collect your first payment</ButtonLink>} /> : (
        <><TableWrap><thead><tr><Th>Invoice</Th><Th>Date</Th><Th>Member</Th><Th>Total</Th><Th>Method</Th><Th>Status</Th></tr></thead><tbody>
          {rows.map((p) => (
            <tr key={p.id} className="hover:bg-surface2/50">
              <Td>{p.invoice ? <Link className="font-semibold text-brand hover:underline" href={`/dashboard/payments/${p.id}`}>{p.invoice.number}</Link> : <span className="text-muted">—</span>}</Td>
              <Td>{fmtDate(p.paidAt ?? p.dueDate)}</Td><Td><Link className="hover:text-brand" href={`/dashboard/members/${p.memberId}`}>{fullName(p.member)}</Link></Td>
              <Td>{formatMoney(p.finalAmount)}</Td><Td>{p.method.replace("_", " ")}</Td><Td><StatusBadge status={p.status} /></Td>
            </tr>))}</tbody></TableWrap>
          <Pagination page={page} total={count} pageSize={PAGE} basePath="/dashboard/payments" params={params} /></>
      )}
    </>
  );
}

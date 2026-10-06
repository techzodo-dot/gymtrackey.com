import type { Prisma } from "@prisma/client";
import { pageAuth } from "@/server/auth/page";
import { CATEGORIES } from "@/server/services/ops";
import { monthlyExpenses } from "@/server/services/reports";
import { Card } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { ConfirmForm } from "@/components/ui/confirm";
import { BarChart, ShareBars } from "@/components/charts";
import { FormGrid, Input, Select, selectClass } from "@/components/ui/form";
import { EmptyState, Flash, PageHeader, Pagination, SearchBar, Stat, TableWrap, Td, Th } from "@/components/ui/page";
import { fmtDate, isoDate, startOfDay } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { createExpenseAction, deleteExpenseAction } from "./actions";

export const metadata = { title: "Expenses" };
const PAGE = 15;

export default async function Expenses({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; category?: string; q?: string; page?: string }> }) {
  const sp = await searchParams;
  const { db } = await pageAuth("expenses", "expenses");
  const where: Prisma.ExpenseWhereInput = {};
  if (sp.category) where.category = sp.category as never;
  if (sp.q) where.OR = [{ vendor: { contains: sp.q, mode: "insensitive" } }, { description: { contains: sp.q, mode: "insensitive" } }];
  const page = Math.max(1, Number(sp.page) || 1);
  const monthStart = new Date(startOfDay().getFullYear(), startOfDay().getMonth(), 1);
  const [rows, count, thisMonth, summary] = await Promise.all([
    db.expense.findMany({ where, orderBy: { date: "desc" }, skip: (page - 1) * PAGE, take: PAGE }), db.expense.count({ where }),
    db.expense.aggregate({ _sum: { amount: true }, where: { date: { gte: monthStart } } }), monthlyExpenses(db, 6),
  ]);
  return (
    <>
      <PageHeader title="Expenses" actions={<ButtonLink href="/api/export/expenses" variant="secondary">Export CSV</ButtonLink>} />
      <Flash ok={sp.ok} error={sp.error} />
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Stat label="This month" value={formatMoney(thisMonth._sum.amount ?? 0)} />
        <Card className="lg:col-span-1"><BarChart title="Monthly expenses" data={summary.monthly} money height={90} /></Card>
        <Card><ShareBars title="By category (6 months)" money data={Object.entries(summary.byCategory).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }))} /></Card>
      </div>
      <Card className="mb-6"><h2 className="mb-3 font-bold">Add expense</h2>
        <form action={createExpenseAction} className="space-y-4"><FormGrid className="sm:grid-cols-3">
          <Select label="Category" name="category" options={CATEGORIES.map((c) => [c, c[0] + c.slice(1).toLowerCase()])} /><Input label="Amount (₹) *" name="amount" type="number" step="0.01" min="0.01" required />
          <Input label="Date *" name="date" type="date" required defaultValue={isoDate(new Date())} /><Select label="Payment method" name="method" options={["CASH", "UPI", "CARD", "BANK_TRANSFER", "CHEQUE", "ONLINE"].map((m) => [m, m.replace("_", " ")])} />
          <Input label="Vendor" name="vendor" /><Input label="Description" name="description" /></FormGrid><Button type="submit">Add expense</Button></form></Card>
      <SearchBar action="/dashboard/expenses" q={sp.q} placeholder="Vendor or description"><select name="category" defaultValue={sp.category ?? ""} aria-label="Category" className={`${selectClass} w-auto`}><option value="">All categories</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></SearchBar>
      {rows.length === 0 ? <EmptyState title="No expenses recorded." body="Track rent, salaries, utilities and more to see your profit." /> : (
        <><TableWrap><thead><tr><Th>Date</Th><Th>Category</Th><Th>Vendor</Th><Th>Method</Th><Th>Amount</Th><Th /></tr></thead><tbody>
          {rows.map((e) => <tr key={e.id}><Td>{fmtDate(e.date)}</Td><Td>{e.category}</Td><Td>{e.vendor ?? "—"}</Td><Td>{e.method.replace("_", " ")}</Td><Td>{formatMoney(e.amount)}</Td>
            <Td><ConfirmForm action={deleteExpenseAction} title="Delete this expense?" message="This cannot be undone." label="Delete" confirmLabel="Delete"><input type="hidden" name="id" value={e.id} /></ConfirmForm></Td></tr>)}</tbody></TableWrap>
          <Pagination page={page} total={count} pageSize={PAGE} basePath="/dashboard/expenses" params={{ q: sp.q, category: sp.category }} /></>)}
    </>
  );
}

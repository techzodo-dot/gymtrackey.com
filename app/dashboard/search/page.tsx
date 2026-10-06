import Link from "next/link";
import { pageAuth } from "@/server/auth/page";
import { can } from "@/server/auth/permissions";
import { EmptyState, PageHeader, SearchBar } from "@/components/ui/page";
import { fullName } from "@/lib/format";
import { formatMoney } from "@/lib/money";

export const metadata = { title: "Search" };

export default async function Search({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const { db, user } = await pageAuth();
  const allow = (p: Parameters<typeof can>[2]) => can(user.role, user.permissions, p);
  const term = q.trim();
  const [members, invoices, trainers, staff] = term.length < 2 ? [[], [], [], []] : await Promise.all([
    allow("members") ? db.member.findMany({ where: { deletedAt: null, OR: [{ firstName: { contains: term, mode: "insensitive" } }, { lastName: { contains: term, mode: "insensitive" } }, { phone: { contains: term } }, { email: { contains: term, mode: "insensitive" } }, { memberCode: { contains: term, mode: "insensitive" } }] }, take: 8 }) : [],
    allow("payments") ? db.invoice.findMany({ where: { number: { contains: term, mode: "insensitive" } }, take: 8, include: { member: true } }) : [],
    allow("trainers") ? db.trainer.findMany({ where: { OR: [{ name: { contains: term, mode: "insensitive" } }, { phone: { contains: term } }, { email: { contains: term, mode: "insensitive" } }] }, take: 5 }) : [],
    allow("staff") ? db.user.findMany({ where: { role: { not: "MEMBER" }, OR: [{ name: { contains: term, mode: "insensitive" } }, { email: { contains: term, mode: "insensitive" } }] }, take: 5 }) : [],
  ]);
  const none = !members.length && !invoices.length && !trainers.length && !staff.length;
  return (
    <div className="max-w-3xl"><PageHeader title="Search" /><SearchBar action="/dashboard/search" q={q} placeholder="Name, phone, email, member ID or invoice number" />
      {term.length >= 2 && none && <EmptyState title="No results." body={`Nothing matched “${term}”.`} />}
      {members.length > 0 && <section className="mb-6"><h2 className="mb-2 text-sm font-bold text-muted">Members</h2><ul className="space-y-1.5">{members.map((m) => <li key={m.id}><Link className="block rounded-xl border border-line bg-surface px-4 py-2.5 text-sm hover:bg-surface2" href={`/dashboard/members/${m.id}`}><b>{fullName(m)}</b> <span className="text-muted">{m.memberCode} · {m.phone}</span></Link></li>)}</ul></section>}
      {invoices.length > 0 && <section className="mb-6"><h2 className="mb-2 text-sm font-bold text-muted">Invoices</h2><ul className="space-y-1.5">{invoices.map((i) => <li key={i.id}><Link className="block rounded-xl border border-line bg-surface px-4 py-2.5 text-sm hover:bg-surface2" href={`/dashboard/payments/${i.paymentId}`}><b>{i.number}</b> <span className="text-muted">{fullName(i.member)} · {formatMoney(i.total)}</span></Link></li>)}</ul></section>}
      {trainers.length > 0 && <section className="mb-6"><h2 className="mb-2 text-sm font-bold text-muted">Trainers</h2><ul className="space-y-1.5">{trainers.map((t) => <li key={t.id}><Link className="block rounded-xl border border-line bg-surface px-4 py-2.5 text-sm hover:bg-surface2" href="/dashboard/trainers">{t.name} <span className="text-muted">{t.specialization}</span></Link></li>)}</ul></section>}
      {staff.length > 0 && <section><h2 className="mb-2 text-sm font-bold text-muted">Staff</h2><ul className="space-y-1.5">{staff.map((s) => <li key={s.id}><Link className="block rounded-xl border border-line bg-surface px-4 py-2.5 text-sm hover:bg-surface2" href="/dashboard/staff">{s.name} <span className="text-muted">{s.email}</span></Link></li>)}</ul></section>}
    </div>
  );
}

import { prisma } from "@/server/db/prisma";
import { EmptyState, PageHeader, TableWrap, Td, Th } from "@/components/ui/page";
import { selectClass } from "@/components/ui/form";
import { fmtDate } from "@/lib/format";
import { setLeadStatusAction } from "../actions";

export const metadata = { title: "Leads · Admin" };
const STATUSES = ["NEW", "CONTACTED", "DEMO_SCHEDULED", "TRIAL", "CONVERTED", "LOST"];

export default async function Leads() {
  const [leads, inquiries] = await Promise.all([prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: 100 }), prisma.contactInquiry.findMany({ orderBy: { createdAt: "desc" }, take: 50 })]);
  return (
    <>
      <PageHeader title="Leads" subtitle="Demo requests from the website." />
      {leads.length === 0 ? <EmptyState title="No leads yet." body="Demo requests from /demo will appear here." /> : <TableWrap><thead><tr><Th>Gym</Th><Th>Contact</Th><Th>Members</Th><Th>City</Th><Th>Date</Th><Th>Status</Th></tr></thead><tbody>
        {leads.map((l) => <tr key={l.id}><Td><b>{l.gymName}</b><div className="text-xs text-muted">{l.message}</div></Td><Td>{l.name}<div className="text-xs text-muted">{l.phone} · {l.email}</div></Td><Td>{l.memberCount ?? "—"}</Td><Td>{l.city ?? "—"}</Td><Td>{fmtDate(l.createdAt)}</Td>
          <Td><form action={setLeadStatusAction}><input type="hidden" name="id" value={l.id} /><select name="status" defaultValue={l.status} aria-label="Lead status" className={`${selectClass} w-auto py-1.5`}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select> <button className="text-xs text-brand underline">Save</button></form></Td></tr>)}</tbody></TableWrap>}
      <h2 className="mb-3 mt-8 text-lg font-bold">Contact inquiries</h2>
      {inquiries.length === 0 ? <p className="text-sm text-muted">None yet.</p> : <ul className="space-y-2">{inquiries.map((i) => <li key={i.id} className="rounded-xl border border-line bg-surface p-4 text-sm"><b>{i.subject}</b> <span className="text-xs text-muted">— {i.name} · {i.email}{i.phone ? ` · ${i.phone}` : ""} · {fmtDate(i.createdAt)}</span><p className="mt-1 whitespace-pre-wrap text-muted">{i.message}</p></li>)}</ul>}
    </>
  );
}

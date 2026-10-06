import Link from "next/link";
import { prisma } from "@/server/db/prisma";
import { EmptyState, PageHeader, StatusBadge, TableWrap, Td, Th } from "@/components/ui/page";
import { fmtDate } from "@/lib/format";

export const metadata = { title: "Support · Admin" };

export default async function Tickets() {
  const tickets = await prisma.supportTicket.findMany({ orderBy: [{ status: "asc" }, { updatedAt: "desc" }], take: 100, include: { tenant: { select: { name: true } } } });
  return (
    <>
      <PageHeader title="Support tickets" />
      {tickets.length === 0 ? <EmptyState title="No tickets." /> : <TableWrap><thead><tr><Th>Subject</Th><Th>Gym</Th><Th>Priority</Th><Th>Status</Th><Th>Updated</Th></tr></thead><tbody>
        {tickets.map((t) => <tr key={t.id}><Td><Link className="font-semibold hover:text-brand" href={`/admin/tickets/${t.id}`}>{t.subject}</Link></Td><Td>{t.tenant.name}</Td><Td>{t.priority}</Td><Td><StatusBadge status={t.status} /></Td><Td>{fmtDate(t.updatedAt)}</Td></tr>)}</tbody></TableWrap>}
    </>
  );
}

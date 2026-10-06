import Link from "next/link";
import { pageAuth } from "@/server/auth/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/form";
import { EmptyState, Flash, PageHeader, StatusBadge, TableWrap, Td, Th } from "@/components/ui/page";
import { fmtDate } from "@/lib/format";
import { createTicketAction } from "./actions";

export const metadata = { title: "Support" };

export default async function Support({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const { db } = await pageAuth("support");
  const tickets = await db.supportTicket.findMany({ orderBy: { updatedAt: "desc" }, take: 50 });
  return (
    <>
      <PageHeader title="Support" subtitle="We usually reply within one business day." /><Flash ok={sp.ok} error={sp.error} />
      {tickets.length === 0 ? <EmptyState title="No tickets yet." body="Need help? Open a ticket below." /> : <TableWrap><thead><tr><Th>Subject</Th><Th>Priority</Th><Th>Status</Th><Th>Updated</Th></tr></thead><tbody>
        {tickets.map((t) => <tr key={t.id}><Td><Link className="font-semibold hover:text-brand" href={`/dashboard/support/${t.id}`}>{t.subject}</Link></Td><Td>{t.priority}</Td><Td><StatusBadge status={t.status} /></Td><Td>{fmtDate(t.updatedAt)}</Td></tr>)}</tbody></TableWrap>}
      <Card className="mt-8 max-w-2xl"><h2 className="mb-4 text-lg font-bold">New ticket</h2><form action={createTicketAction} className="space-y-4"><Input label="Subject" name="subject" required /><Textarea label="How can we help?" name="body" required rows={5} /><Button type="submit">Submit ticket</Button></form></Card>
    </>
  );
}

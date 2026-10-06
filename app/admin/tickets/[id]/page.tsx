import { notFound } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormGrid, Select, Textarea } from "@/components/ui/form";
import { Flash, PageHeader, StatusBadge } from "@/components/ui/page";
import { fmtDateTime } from "@/lib/format";
import { adminReplyAction } from "../../actions";

export default async function AdminTicket({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const t = await prisma.supportTicket.findUnique({ where: { id }, include: { tenant: true, messages: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true, role: true } } } } } });
  if (!t) notFound();
  return (
    <div className="max-w-3xl">
      <PageHeader title={t.subject} subtitle={`${t.tenant.name} · priority ${t.priority}`} actions={<StatusBadge status={t.status} />} /><Flash error={sp.error} />
      <div className="space-y-3">{t.messages.map((m) => <Card key={m.id} className={m.author.role === "SUPER_ADMIN" ? "border-brand2/40" : ""}><p className="mb-1 text-xs text-muted">{m.author.name} ({m.author.role === "SUPER_ADMIN" ? "support" : "customer"}) · {fmtDateTime(m.createdAt)}</p><p className="whitespace-pre-wrap text-sm">{m.body}</p></Card>)}</div>
      <Card className="mt-6"><form action={adminReplyAction} className="space-y-3"><input type="hidden" name="id" value={t.id} /><Textarea label="Reply" name="body" required />
        <FormGrid><Select label="Status" name="status" defaultValue={t.status === "OPEN" ? "IN_PROGRESS" : t.status} options={[["OPEN", "Open"], ["IN_PROGRESS", "In progress"], ["RESOLVED", "Resolved"], ["CLOSED", "Closed"]]} /><Select label="Priority" name="priority" defaultValue={t.priority} options={[["LOW", "Low"], ["NORMAL", "Normal"], ["HIGH", "High"], ["URGENT", "Urgent"]]} /></FormGrid><Button type="submit">Send reply</Button></form></Card>
    </div>
  );
}

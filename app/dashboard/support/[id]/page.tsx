import { notFound } from "next/navigation";
import { pageAuth } from "@/server/auth/page";
import { prisma } from "@/server/db/prisma";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form";
import { Flash, PageHeader, StatusBadge } from "@/components/ui/page";
import { ConfirmForm } from "@/components/ui/confirm";
import { fmtDateTime } from "@/lib/format";
import { closeTicketAction, replyAction } from "../actions";

export default async function Ticket({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { db } = await pageAuth("support");
  const t = await db.supportTicket.findFirst({ where: { id } }); // tenant-locked lookup gates the messages below
  if (!t) notFound();
  const messages = await prisma.supportMessage.findMany({ where: { ticketId: t.id }, orderBy: { createdAt: "asc" }, include: { author: { select: { name: true, role: true } } } });
  return (
    <div className="max-w-3xl">
      <PageHeader title={t.subject} subtitle={`Priority ${t.priority}`} actions={<StatusBadge status={t.status} />} /><Flash ok={sp.ok} error={sp.error} />
      <div className="space-y-3">{messages.map((m) => <Card key={m.id} className={m.author.role === "SUPER_ADMIN" ? "border-brand2/40" : ""}><p className="mb-1 text-xs text-muted">{m.author.role === "SUPER_ADMIN" ? "GymTrackey Support" : m.author.name} · {fmtDateTime(m.createdAt)}</p><p className="whitespace-pre-wrap text-sm">{m.body}</p></Card>)}</div>
      {t.status !== "CLOSED" && <Card className="mt-6"><form action={replyAction} className="space-y-3"><input type="hidden" name="id" value={t.id} /><Textarea label="Reply" name="body" required /><div className="flex gap-2"><Button type="submit">Send reply</Button></div></form>
        <div className="mt-3"><ConfirmForm action={closeTicketAction} title="Close this ticket?" message="You can reopen it by replying later." label="Close ticket" confirmLabel="Close" danger={false}><input type="hidden" name="id" value={t.id} /></ConfirmForm></div></Card>}
    </div>
  );
}

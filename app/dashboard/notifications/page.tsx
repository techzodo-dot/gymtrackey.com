import { pageAuth } from "@/server/auth/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormGrid, Input, Select, Textarea } from "@/components/ui/form";
import { EmptyState, Flash, PageHeader, StatusBadge } from "@/components/ui/page";
import { fmtDateTime, fullName } from "@/lib/format";
import { announceAction } from "./actions";

export const metadata = { title: "Notifications" };

export default async function Notifications({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const { db } = await pageAuth("notifications");
  const [items, anns, plans, trainers, reminders] = await Promise.all([
    db.notification.findMany({ orderBy: { createdAt: "desc" }, take: 30, include: { member: true } }),
    db.announcement.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    db.membershipPlan.findMany({ select: { id: true, name: true } }), db.trainer.findMany({ select: { id: true, name: true } }),
    db.reminder.findMany({ orderBy: { scheduledAt: "desc" }, take: 10, include: { member: true } }),
  ]);
  return (
    <>
      <PageHeader title="Notifications & announcements" /><Flash ok={sp.ok} error={sp.error} />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card><h2 className="mb-3 font-bold">Send announcement</h2>
            <form action={announceAction} className="space-y-4"><Input label="Title" name="title" required placeholder="Gym closed tomorrow for maintenance" /><Textarea label="Message" name="body" required />
              <FormGrid><Select label="Send to" name="audience" options={[["ALL_MEMBERS", "All members"], ["MEMBERSHIP_PLAN", "A membership plan"], ["TRAINER_MEMBERS", "A trainer's members"]]} />
                <Select label="Plan / trainer (if selected above)" name="targetId" placeholder="—" options={[...plans.map((p) => [p.id, `Plan: ${p.name}`] as const), ...trainers.map((t) => [t.id, `Trainer: ${t.name}`] as const)]} /></FormGrid>
              <Button type="submit">Send announcement</Button></form></Card>
          <Card className="p-0"><h2 className="border-b border-line px-5 py-3 font-bold">Recent reminders</h2>
            {reminders.length === 0 ? <p className="p-5 text-sm text-muted">No reminders sent yet.</p> : <ul className="divide-y divide-line text-sm">{reminders.map((r) => <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-2.5"><span className="min-w-0 truncate">{fullName(r.member)} · {r.channel}{r.error ? <span className="text-xs text-muted"> — {r.error}</span> : null}</span><StatusBadge status={r.status} /></li>)}</ul>}</Card>
        </div>
        <div>
          <h2 className="mb-3 font-bold">Activity</h2>
          {items.length === 0 ? <EmptyState title="No notifications yet." body="Payments, renewals, reminders and announcements show up here." /> : (
            <ul className="space-y-2">{items.map((n) => <li key={n.id} className="rounded-xl border border-line bg-surface p-3 text-sm"><div className="flex justify-between gap-2"><b>{n.title}</b><span className="shrink-0 text-xs text-muted">{fmtDateTime(n.createdAt)}</span></div><p className="mt-0.5 text-muted">{n.member ? `${fullName(n.member)} — ` : ""}{n.body}</p></li>)}</ul>)}
          {anns.length > 0 && <p className="mt-4 text-xs text-muted">{anns.length} announcement(s) sent recently.</p>}
        </div>
      </div>
    </>
  );
}

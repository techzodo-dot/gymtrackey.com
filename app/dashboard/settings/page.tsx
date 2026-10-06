import { pageAuth } from "@/server/auth/page";
import { getSetting } from "@/server/services/ops";
import { defaultReminderSettings } from "@/server/services/reminders";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormGrid, Input, Textarea } from "@/components/ui/form";
import { Flash, PageHeader, Tabs } from "@/components/ui/page";
import { saveGymAction, saveOpsAction, saveRemindersAction, saveTaxAction } from "./actions";
import { providerFor } from "@/server/services/messaging";
import { fmtDateTime } from "@/lib/format";

export const metadata = { title: "Settings" };
const TABS = [["gym", "Gym"], ["invoice", "Invoice & tax"], ["reminders", "Reminders"], ["operations", "Attendance & membership"], ["activity", "Activity log"], ["security", "Security"]] as const;
const Check = ({ name, label, checked }: { name: string; label: string; checked?: boolean }) => <label className="flex items-center gap-2 text-sm"><input type="checkbox" name={name} defaultChecked={checked} className="accent-[var(--brand-to)]" />{label}</label>;

export default async function Settings({ searchParams }: { searchParams: Promise<{ tab?: string; ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const tab = TABS.some(([k]) => k === sp.tab) ? sp.tab! : "gym";
  const { db, tenant } = await pageAuth("settings");
  const [gym, tax, rem, att, mem] = await Promise.all([
    db.gym.findFirstOrThrow(), getSetting(db, "tax", { gstEnabled: false, gstPct: 18, interState: false }), getSetting(db, "reminders", defaultReminderSettings),
    getSetting(db, "attendance", { inactiveDays: 14 }), getSetting(db, "membership", { extendOnFreeze: true }),
  ]);
  const logs = tab === "activity" ? await db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { user: { select: { name: true } } } }) : [];
  return (
    <div className="max-w-3xl">
      <PageHeader title="Settings" /><Flash ok={sp.ok} error={sp.error} /><Tabs tabs={TABS} active={tab} base="/dashboard/settings" />
      {tab === "gym" && <Card><form action={saveGymAction} className="space-y-4"><FormGrid>
        <Input label="Gym name *" name="name" required defaultValue={gym.name} /><Input label="Phone" name="phone" defaultValue={gym.phone ?? ""} /><Input label="Email" name="email" type="email" defaultValue={gym.email ?? ""} /><Input label="Website" name="website" type="url" defaultValue={gym.website ?? ""} />
        <Input label="City" name="city" defaultValue={gym.city ?? ""} /><Input label="State" name="state" defaultValue={gym.state ?? ""} /><Input label="GSTIN" name="gstin" defaultValue={gym.gstin ?? ""} /><Input label="Invoice prefix" name="invoicePrefix" defaultValue={gym.invoicePrefix} hint="e.g. GT → GT-2026-000001" />
        <Input label="Brand colour" name="primaryColor" type="text" placeholder="#1e9bff" defaultValue={gym.primaryColor ?? ""} hint="Used on receipts (Professional+ plans)" /></FormGrid>
        <Textarea label="Address" name="address" defaultValue={gym.address ?? ""} /><Button type="submit">Save</Button></form></Card>}
      {tab === "invoice" && <Card><form action={saveTaxAction} className="space-y-4">
        <Check name="gstEnabled" label="Charge GST on payments" checked={tax.gstEnabled} /><Input label="GST rate %" name="gstPct" type="number" step="0.01" defaultValue={tax.gstPct} wrap="max-w-[12rem]" />
        <Check name="interState" label="Inter-state supply (IGST instead of CGST + SGST)" checked={tax.interState} /><Button type="submit">Save</Button></form></Card>}
      {tab === "reminders" && <Card><form action={saveRemindersAction} className="space-y-5">
        <fieldset><legend className="mb-2 text-sm font-semibold">When to remind</legend><div className="grid gap-2 sm:grid-cols-2">
          <Check name="d7" label="7 days before due" checked={rem.d7} /><Check name="d3" label="3 days before due" checked={rem.d3} /><Check name="d1" label="1 day before due" checked={rem.d1} /><Check name="d0" label="On the due date" checked={rem.d0} /><Check name="overdue3" label="3 days after due date" checked={rem.overdue3} /></div></fieldset>
        <fieldset><legend className="mb-2 text-sm font-semibold">Channels</legend><div className="space-y-1">
          {(["EMAIL", "WHATSAPP", "SMS"] as const).map((c) => <div key={c} className="flex items-center justify-between"><Check name={`ch_${c}`} label={c[0] + c.slice(1).toLowerCase()} checked={rem.channels.includes(c)} /><span className={`text-xs ${providerFor(c).configured() ? "text-brand" : "text-warn"}`}>{providerFor(c).configured() ? "provider connected" : "provider not connected"}</span></div>)}</div>
          <p className="mt-2 text-xs text-muted">In-app notifications are always created. External messages are sent only through connected providers (see EMAIL_SERVER / WHATSAPP_* / SMS_* environment variables).</p></fieldset>
        <Textarea label="Message template" name="template" rows={4} defaultValue={rem.template} />
        <p className="text-xs text-muted">Variables: {"{{member_name}} {{amount}} {{due_date}} {{gym_name}}"}</p><Button type="submit">Save</Button></form></Card>}
      {tab === "operations" && <Card><form action={saveOpsAction} className="space-y-4">
        <Input label="Flag members inactive after (days)" name="inactiveDays" type="number" min={1} max={365} defaultValue={att.inactiveDays} wrap="max-w-[14rem]" />
        <Check name="extendOnFreeze" label="Extend membership end date when frozen" checked={mem.extendOnFreeze} /><Button type="submit">Save</Button></form></Card>}
      {tab === "activity" && <Card className="p-0">{logs.length === 0 ? <p className="p-5 text-sm text-muted">No activity yet.</p> : <ul className="divide-y divide-line text-sm">{logs.map((l) => <li key={l.id} className="flex flex-wrap justify-between gap-2 px-5 py-2.5"><span><b>{l.action}</b> <span className="text-muted">by {l.user?.name ?? "system"}{l.ip ? ` · ${l.ip}` : ""}</span></span><span className="text-xs text-muted">{fmtDateTime(l.createdAt)}</span></li>)}</ul>}</Card>}
      {tab === "security" && <Card className="space-y-2 text-sm"><p>Your data is isolated per gym. Sessions use secure, HTTP-only cookies and every action is permission-checked on the server.</p><p className="text-muted">Plan: <b>{tenant.planCode}</b> · Status: <b>{tenant.status}</b>. Staff permissions are managed under Staff.</p></Card>}
    </div>
  );
}

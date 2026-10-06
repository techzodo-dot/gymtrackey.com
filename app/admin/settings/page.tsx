import { getPlatformSettings } from "@/server/services/platform";
import { razorpayConfigured } from "@/server/services/billing";
import { providerFor } from "@/server/services/messaging";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { Flash, PageHeader } from "@/components/ui/page";
import { saveSettingsAction } from "../actions";

export const metadata = { title: "Settings · Admin" };

export default async function AdminSettings({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const s = await getPlatformSettings();
  const rows: [string, boolean][] = [["Razorpay keys", razorpayConfigured()], ["Webhook secret", !!process.env.RAZORPAY_WEBHOOK_SECRET], ["Email (SMTP)", providerFor("EMAIL").configured()], ["WhatsApp provider", providerFor("WHATSAPP").configured()], ["Cron secret", !!process.env.CRON_SECRET], ["Object storage", !!process.env.STORAGE_BUCKET]];
  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Platform settings" /><Flash ok={sp.ok} error={sp.error} />
      <Card><form action={saveSettingsAction} className="space-y-4"><Input label="Free trial length (days)" name="trialDays" type="number" min={1} max={90} defaultValue={s.trialDays} wrap="max-w-[12rem]" />
        <Input label="Announcement banner (shown to all gyms)" name="banner" defaultValue={s.banner} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="maintenance" defaultChecked={s.maintenance} className="accent-[var(--brand-to)]" />Maintenance mode (shows a notice to all gyms)</label><Button type="submit">Save</Button></form></Card>
      <Card><h2 className="mb-3 font-bold">Integrations</h2><ul className="space-y-1.5 text-sm">{rows.map(([k, ok]) => <li key={k} className="flex justify-between"><span>{k}</span><span className={ok ? "text-brand" : "text-warn"}>{ok ? "configured" : "not configured"}</span></li>)}</ul></Card>
    </div>
  );
}

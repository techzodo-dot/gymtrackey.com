import { prisma } from "@/server/db/prisma";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormGrid, Input } from "@/components/ui/form";
import { Flash, PageHeader } from "@/components/ui/page";
import { savePlanAction } from "../actions";

export const metadata = { title: "Plans · Admin" };
const FLAGS: [string, string][] = [["attendance", "Attendance"], ["expenses", "Expenses"], ["trainers", "Trainers & workouts"], ["diet", "Diet plans"], ["progressPhotos", "Progress photos"], ["multiBranch", "Multiple branches"], ["whatsapp", "WhatsApp reminders"], ["apiAccess", "API access"], ["customBranding", "Custom branding"]];

export default async function Plans({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const plans = await prisma.subscriptionPlan.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <>
      <PageHeader title="Plans & pricing" subtitle="Changes apply immediately to the pricing page, billing and server-side limits. Leave a limit empty for unlimited." /><Flash ok={sp.ok} error={sp.error} />
      <div className="grid gap-4 xl:grid-cols-2">
        {plans.map((p) => { const f = p.features as Record<string, unknown>; return (
          <Card key={p.id}><form action={savePlanAction} className="space-y-4"><input type="hidden" name="id" value={p.id} />
            <FormGrid><Input label="Name" name="name" defaultValue={p.name} /><Input label="Price (₹/month)" name="price" type="number" step="1" defaultValue={p.priceMonthly / 100} hint={p.isCustom ? "Custom plan — price hidden publicly" : undefined} />
              <Input label="Member limit" name="memberLimit" type="number" defaultValue={p.memberLimit ?? ""} /><Input label="Branch limit" name="branchLimit" type="number" defaultValue={p.branchLimit ?? ""} /><Input label="Staff limit" name="staffLimit" type="number" defaultValue={p.staffLimit ?? ""} /></FormGrid>
            <fieldset><legend className="mb-2 text-sm font-semibold">Feature flags</legend><div className="grid grid-cols-2 gap-2">{FLAGS.map(([k, l]) => <label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" name={`f_${k}`} defaultChecked={f[k] === true} className="accent-[var(--brand-to)]" />{l}</label>)}</div></fieldset>
            <Button type="submit">Save {p.name}</Button></form></Card>); })}
      </div>
    </>
  );
}

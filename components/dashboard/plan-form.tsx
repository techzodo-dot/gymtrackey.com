import { Button } from "@/components/ui/button";
import { FormGrid, Input, Textarea } from "@/components/ui/form";
import type { MembershipPlan } from "@prisma/client";

export function PlanForm({ action, plan, submit }: { action: (fd: FormData) => void | Promise<void>; plan?: MembershipPlan; submit: string }) {
  return (
    <form action={action} className="space-y-4">
      {plan && <input type="hidden" name="id" value={plan.id} />}
      <FormGrid>
        <Input label="Plan name *" name="name" required defaultValue={plan?.name} placeholder="Monthly" />
        <Input label="Duration (days) *" name="durationDays" type="number" min={1} required defaultValue={plan?.durationDays} />
        <Input label="Price (₹) *" name="price" type="number" step="0.01" min={0} required defaultValue={plan ? plan.price / 100 : ""} />
        <Input label="Freeze days allowed" name="freezeDays" type="number" min={0} defaultValue={plan?.freezeDays ?? 0} />
        <Input label="Access type" name="accessType" defaultValue={plan?.accessType ?? "FULL"} hint="e.g. FULL, OFF-PEAK, WEEKDAYS" />
        <label className="flex items-center gap-2 self-end pb-3 text-sm"><input type="checkbox" name="trainerIncluded" defaultChecked={plan?.trainerIncluded} className="accent-[var(--brand-to)]" />Personal trainer included</label>
      </FormGrid>
      <Textarea label="Description" name="description" defaultValue={plan?.description ?? ""} />
      <Button type="submit">{submit}</Button>
    </form>
  );
}

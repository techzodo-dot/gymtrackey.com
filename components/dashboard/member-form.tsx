import { Input, Select, Textarea, FormGrid } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { isoDate } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import type { Member } from "@prisma/client";

type Opt = { id: string; name: string; price?: number };

export function MemberForm({ action, member, plans = [], trainers = [], branches = [], submit, withPlan }: {
  action: (fd: FormData) => void | Promise<void>; member?: Member; plans?: Opt[]; trainers?: Opt[]; branches?: Opt[]; submit: string; withPlan?: boolean;
}) {
  return (
    <form action={action} className="space-y-6">
      {member && <input type="hidden" name="id" value={member.id} />}
      <FormGrid>
        <Input label="First name *" name="firstName" required defaultValue={member?.firstName} />
        <Input label="Last name" name="lastName" defaultValue={member?.lastName ?? ""} />
        <Input label="Phone *" name="phone" type="tel" required defaultValue={member?.phone} />
        <Input label="Email" name="email" type="email" defaultValue={member?.email ?? ""} />
        <Select label="Gender" name="gender" defaultValue={member?.gender ?? ""} placeholder="—" options={[["MALE", "Male"], ["FEMALE", "Female"], ["OTHER", "Other"]]} />
        <Input label="Date of birth" name="dob" type="date" defaultValue={isoDate(member?.dob)} />
        <Input label="Emergency contact" name="emergencyContact" defaultValue={member?.emergencyContact ?? ""} />
        <Input label="Blood group" name="bloodGroup" defaultValue={member?.bloodGroup ?? ""} />
        <Input label="Height (cm)" name="heightCm" type="number" step="0.1" defaultValue={member?.heightCm?.toString() ?? ""} />
        <Input label="Weight (kg)" name="weightKg" type="number" step="0.1" defaultValue={member?.weightKg?.toString() ?? ""} />
        <Select label="Trainer" name="trainerId" defaultValue={member?.trainerId ?? ""} placeholder="No trainer" options={trainers.map((t) => [t.id, t.name])} />
        {branches.length > 1 && <Select label="Branch" name="branchId" defaultValue={member?.branchId ?? ""} options={branches.map((b) => [b.id, b.name])} />}
        {member && <Select label="Status" name="status" defaultValue={member.status} options={[["ACTIVE", "Active"], ["EXPIRED", "Expired"], ["SUSPENDED", "Suspended"], ["INACTIVE", "Inactive"]]} />}
      </FormGrid>
      <Textarea label="Address" name="address" defaultValue={member?.address ?? ""} />
      <FormGrid>
        <Textarea label="Fitness goals" name="fitnessGoals" defaultValue={member?.fitnessGoals ?? ""} />
        <Textarea label="Medical notes" name="medicalNotes" defaultValue={member?.medicalNotes ?? ""} />
      </FormGrid>
      <Textarea label="Notes" name="notes" defaultValue={member?.notes ?? ""} />

      {withPlan && (
        <fieldset className="rounded-card border border-line p-4">
          <legend className="px-2 text-sm font-semibold">Membership & first payment (optional)</legend>
          <FormGrid>
            <Select label="Membership plan" name="planId" placeholder="No plan yet" options={plans.map((p) => [p.id, `${p.name} — ${formatMoney(p.price ?? 0)}`])} />
            <Select label="Collect payment now" name="collect" options={[["", "Not now"], ["CASH", "Cash"], ["UPI", "UPI"], ["CARD", "Card"], ["BANK_TRANSFER", "Bank transfer"], ["CHEQUE", "Cheque"], ["ONLINE", "Online"]]} hint="Creates the payment, invoice and receipt." />
          </FormGrid>
        </fieldset>
      )}
      <Button type="submit">{submit}</Button>
    </form>
  );
}

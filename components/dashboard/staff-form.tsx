"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormGrid, Input, Select } from "@/components/ui/form";
import { createStaffAction, type StaffState } from "@/app/dashboard/staff/actions";

const PERMS = ["members", "memberships", "payments", "attendance", "trainers", "workouts", "diets", "measurements", "reports", "expenses", "settings", "notifications"];

export function StaffForm() {
  const [state, action, pending] = useActionState<StaffState, FormData>(createStaffAction, null);
  return (
    <form action={action} className="space-y-4">
      <FormGrid>
        <Input label="Name *" name="name" required /><Input label="Email *" name="email" type="email" required /><Input label="Phone" name="phone" type="tel" />
        <Select label="Role" name="role" options={[["RECEPTIONIST", "Receptionist"], ["MANAGER", "Manager"], ["TRAINER", "Trainer"]]} />
      </FormGrid>
      <fieldset><legend className="mb-2 text-sm font-semibold">Custom permissions <span className="font-normal text-muted">(leave all unchecked to use the role defaults)</span></legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{PERMS.map((p) => <label key={p} className="flex items-center gap-2 text-sm"><input type="checkbox" name="permissions" value={p} className="accent-[var(--brand-to)]" />{p}</label>)}</div></fieldset>
      {state?.error && <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</p>}
      {state?.created && (
        <div role="status" className="rounded-xl bg-brand/10 p-4 text-sm"><p className="font-semibold text-brand">Staff added. Share these credentials securely — the password is shown only once.</p>
          <p className="mt-2">Email: <code>{state.created.email}</code></p><p>Temporary password: <code className="select-all">{state.created.tempPassword}</code></p></div>)}
      <Button type="submit" disabled={pending}>{pending ? "Adding…" : "Add staff"}</Button>
    </form>
  );
}

"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { grantPortalAccessAction, type PortalState } from "@/app/dashboard/members/actions";

export function PortalAccess({ memberId }: { memberId: string }) {
  const [state, action, pending] = useActionState<PortalState, FormData>(grantPortalAccessAction, null);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="id" value={memberId} />
      <Button type="submit" variant="secondary" disabled={pending}>{pending ? "Creating…" : "Give member portal access"}</Button>
      {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      {state?.created && <p role="status" className="rounded-lg bg-brand/10 p-3 text-sm">Login: <code>{state.created.email}</code> · Temporary password (shown once): <code className="select-all">{state.created.tempPassword}</code></p>}
    </form>
  );
}

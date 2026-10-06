"use server";
import { act } from "@/server/actions";
import { requirePermission } from "@/server/auth/guard";
import { cancelSubscription } from "@/server/services/billing";
import { DomainError } from "@/server/errors";

export async function cancelSubscriptionAction() {
  return act("/dashboard/billing", async () => {
    const ctx = await requirePermission("billing");
    if (ctx.tenant.isDemo) throw new DomainError("Billing is disabled in the demo.");
    await cancelSubscription(ctx.tenant.id);
    return `/dashboard/billing?ok=${encodeURIComponent("Subscription cancelled. You keep access until the end of the paid period.")}`;
  });
}

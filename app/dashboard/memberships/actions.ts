"use server";
import { act, formObject, str } from "@/server/actions";
import { actionAuth } from "@/server/auth/page";
import { createPlan, updatePlan } from "@/server/services/memberships";

export async function createPlanAction(fd: FormData) {
  return act("/dashboard/memberships", async () => {
    const ctx = await actionAuth("memberships");
    await createPlan(ctx.db, ctx.tenant.id, formObject(fd));
    return `/dashboard/memberships?ok=${encodeURIComponent("Plan created.")}`;
  });
}
export async function updatePlanAction(fd: FormData) {
  return act("/dashboard/memberships", async () => {
    const ctx = await actionAuth("memberships");
    await updatePlan(ctx.db, str(fd, "id"), formObject(fd));
    return `/dashboard/memberships?ok=${encodeURIComponent("Plan updated.")}`;
  });
}
export async function togglePlanAction(fd: FormData) {
  return act("/dashboard/memberships", async () => {
    const ctx = await actionAuth("memberships");
    const p = await ctx.db.membershipPlan.findFirstOrThrow({ where: { id: str(fd, "id") } });
    await ctx.db.membershipPlan.update({ where: { id: p.id }, data: { isActive: !p.isActive } });
    return `/dashboard/memberships?ok=${encodeURIComponent(p.isActive ? "Plan deactivated." : "Plan activated.")}`;
  });
}

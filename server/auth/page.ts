import { redirect } from "next/navigation";
import type { Tenant } from "@prisma/client";
import { getAuth, requirePermission, type AuthContext } from "./guard";
import { can, type Permission } from "./permissions";
import type { TenantDb } from "@/server/db/tenant";
import { featureEnabled } from "@/server/services/limits";

export type TenantCtx = AuthContext & { db: TenantDb; tenant: Tenant };

/** For server components: redirects instead of throwing. */
export async function pageAuth(perm?: Permission, feature?: string): Promise<TenantCtx> {
  const ctx = await getAuth();
  if (!ctx) redirect("/login");
  if (!ctx.db || !ctx.tenant) redirect(ctx.user.role === "SUPER_ADMIN" ? "/admin" : "/login");
  if (perm && !can(ctx.user.role, ctx.user.permissions, perm)) redirect("/dashboard?error=" + encodeURIComponent("You don't have access to that page."));
  if (feature && !(await featureEnabled(ctx.tenant, feature))) {
    redirect("/dashboard/billing?error=" + encodeURIComponent("This feature isn't included in your plan. Upgrade to unlock it."));
  }
  return ctx as TenantCtx;
}

/** For server actions: throws AuthError (mapped by act()). Write access required. */
export const actionAuth = async (perm: Permission, feature?: string): Promise<TenantCtx> => {
  const ctx = (await requirePermission(perm, { write: true })) as TenantCtx;
  if (feature && !(await featureEnabled(ctx.tenant, feature))) {
    const { LimitError } = await import("@/server/errors");
    throw new LimitError("This feature isn't included in your plan. Upgrade to unlock it.");
  }
  return ctx;
};

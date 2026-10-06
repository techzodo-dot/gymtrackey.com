import { cookies } from "next/headers";
import type { Role, User, Tenant } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { tenantDb, type TenantDb } from "@/server/db/tenant";
import { readSession, SESSION_COOKIE } from "./session";
import { can, type Permission } from "./permissions";

export class AuthError extends Error {
  constructor(public status: 401 | 403, message: string, public code = "FORBIDDEN") {
    super(message);
  }
}

export type AuthContext = {
  user: User;
  tenant: Tenant | null;
  /** Tenant-locked DB. Present for every non-super-admin user. */
  db: TenantDb | null;
  /** Subscription is expired/suspended → read-only access. */
  readOnly: boolean;
};

/** Resolve the caller from the signed cookie, then re-validate against the DB on every request. */
export async function getAuth(): Promise<AuthContext | null> {
  const store = await cookies();
  const claims = await readSession(store.get(SESSION_COOKIE)?.value);
  if (!claims) return null;

  const user = await prisma.user.findUnique({ where: { id: claims.uid } });
  if (!user || !user.isActive) return null;

  if (user.role === "SUPER_ADMIN") return { user, tenant: null, db: null, readOnly: false };

  if (!user.tenantId) return null;
  const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } });
  if (!tenant || tenant.deletedAt || tenant.status === "SUSPENDED") return null;

  const trialOver = tenant.status === "TRIAL" && !!tenant.trialEndsAt && tenant.trialEndsAt < new Date();
  const readOnly = tenant.status === "EXPIRED" || tenant.status === "CANCELLED" || trialOver;
  return { user, tenant, db: tenantDb(user.tenantId), readOnly };
}

export async function requireAuth(): Promise<AuthContext> {
  const ctx = await getAuth();
  if (!ctx) throw new AuthError(401, "Please sign in.", "UNAUTHENTICATED");
  return ctx;
}

export async function requireRole(...roles: Role[]): Promise<AuthContext> {
  const ctx = await requireAuth();
  if (!roles.includes(ctx.user.role)) throw new AuthError(403, "You don't have access to this.");
  return ctx;
}

/** Tenant-scoped access gated by a permission. Returns a context whose `db` is non-null. */
export async function requirePermission(
  permission: Permission,
  opts: { write?: boolean } = {},
): Promise<AuthContext & { db: TenantDb; tenant: Tenant }> {
  const ctx = await requireAuth();
  if (!ctx.db || !ctx.tenant) throw new AuthError(403, "Tenant access required.");
  if (!can(ctx.user.role, ctx.user.permissions, permission)) {
    throw new AuthError(403, "You don't have permission for this action.");
  }
  if (opts.write && ctx.readOnly) {
    throw new AuthError(403, "Your GymTrackey subscription has expired. Renew to make changes.", "SUBSCRIPTION_EXPIRED");
  }
  return ctx as AuthContext & { db: TenantDb; tenant: Tenant };
}

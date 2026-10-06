import type { Tenant } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import type { TenantDb } from "@/server/db/tenant";
import { LimitError } from "@/server/errors";

export async function getPlan(tenant: Pick<Tenant, "planCode">) {
  return prisma.subscriptionPlan.findUnique({ where: { code: tenant.planCode } });
}

/** Trial gets every feature; paid tenants get what their plan enables. */
export async function featureEnabled(tenant: Pick<Tenant, "planCode" | "status" | "isDemo">, feature: string) {
  if (tenant.status === "TRIAL" || tenant.isDemo) return true;
  const plan = await getPlan(tenant);
  const f = (plan?.features ?? {}) as Record<string, unknown>;
  return f[feature] === true || (typeof f[feature] === "string" && f[feature] !== "basic");
}

const LABEL = { members: "member", branches: "branch", staff: "staff" } as const;

/** Server-side plan limit enforcement (never rely on the UI). */
export async function assertWithinLimit(tenant: Pick<Tenant, "planCode" | "status">, db: TenantDb, kind: "members" | "branches" | "staff") {
  // During trial the Starter limits apply to members only loosely; use plan limits throughout for honesty.
  const plan = await getPlan(tenant);
  if (!plan) return;
  const limit = kind === "members" ? plan.memberLimit : kind === "branches" ? plan.branchLimit : plan.staffLimit;
  if (limit == null) return;
  const count =
    kind === "members" ? await db.member.count({ where: { deletedAt: null } })
    : kind === "branches" ? await db.branch.count({ where: { isActive: true } })
    : await db.user.count({ where: { role: { in: ["MANAGER", "TRAINER", "RECEPTIONIST"] }, isActive: true } });
  if (count >= limit) throw new LimitError(`You have reached your ${LABEL[kind]} limit (${limit}) on the ${plan.name} plan. Upgrade your plan to add more.`);
}

export async function usage(db: TenantDb) {
  const [members, branches, staff] = await Promise.all([
    db.member.count({ where: { deletedAt: null } }),
    db.branch.count({ where: { isActive: true } }),
    db.user.count({ where: { role: { in: ["MANAGER", "TRAINER", "RECEPTIONIST"] }, isActive: true } }),
  ]);
  return { members, branches, staff };
}

/** Would adding `adding` more members exceed the plan? Used by bulk import. */
export async function assertMemberCapacity(tenant: Pick<Tenant, "planCode">, db: TenantDb, adding: number) {
  const plan = await getPlan(tenant);
  if (!plan || plan.memberLimit == null) return;
  const count = await db.member.count({ where: { deletedAt: null } });
  if (count + adding > plan.memberLimit) {
    throw new LimitError(`Importing ${adding} member(s) would exceed your member limit (${plan.memberLimit}) on the ${plan.name} plan. Upgrade your plan to import more.`);
  }
}

import { randomBytes } from "node:crypto";
import { prisma } from "@/server/db/prisma";
import { hashPassword } from "@/server/auth/password";
import type { RegisterInput } from "@/lib/validation";
import { DEFAULT_TRIAL_DAYS, ensurePlans } from "./plans";

export class EmailTakenError extends Error {
  constructor() { super("An account with this email already exists."); }
}

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "gym";

/**
 * Creates tenant + gym profile + default branch + owner + default settings + trial subscription
 * atomically. The tenant id is generated server-side.
 */
export async function registerGym(input: RegisterInput, opts: { trialDays?: number } = {}) {
  const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) throw new EmailTakenError();

  await ensurePlans();
  const plan = await prisma.subscriptionPlan.findUniqueOrThrow({ where: { code: "starter" } });
  const passwordHash = await hashPassword(input.password);
  const trialEndsAt = new Date(Date.now() + (opts.trialDays ?? DEFAULT_TRIAL_DAYS) * 86_400_000);

  return prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name: input.gymName,
        slug: `${slugify(input.gymName)}-${randomBytes(3).toString("hex")}`,
        status: "TRIAL",
        trialEndsAt,
        planCode: plan.code,
      },
    });
    const tid = tenant.id;

    await tx.gym.create({
      data: { tenantId: tid, name: input.gymName, phone: input.phone, email: input.email,
        city: input.city, state: input.state, country: input.country },
    });
    const branch = await tx.branch.create({
      data: { tenantId: tid, name: `${input.gymName} — Main`, city: input.city, phone: input.phone, isDefault: true },
    });
    const owner = await tx.user.create({
      data: { tenantId: tid, branchId: branch.id, email: input.email, name: input.ownerName,
        phone: input.phone, passwordHash, role: "OWNER" },
    });
    await tx.setting.createMany({
      data: [
        { tenantId: tid, key: "reminders", value: { d7: true, d3: true, d1: true, d0: true, overdue3: true, channels: ["EMAIL"] } },
        { tenantId: tid, key: "tax", value: { gstEnabled: false, gstPct: 18, interState: false } },
        { tenantId: tid, key: "attendance", value: { inactiveDays: 14 } },
        { tenantId: tid, key: "membership", value: { extendOnFreeze: true } },
      ],
    });
    await tx.subscription.create({
      data: { tenantId: tid, planId: plan.id, status: "TRIAL", renewsAt: trialEndsAt, amount: 0 },
    });
    await tx.auditLog.create({
      data: { tenantId: tid, userId: owner.id, action: "tenant.registered", entity: "Tenant", entityId: tid },
    });
    return { tenant, owner, branch };
  });
}

export function trialDaysLeft(trialEndsAt: Date | null, now = new Date()): number {
  if (!trialEndsAt) return 0;
  return Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / 86_400_000));
}

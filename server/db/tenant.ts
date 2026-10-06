import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

/**
 * Models that carry `tenantId`. Every query against these through `tenantDb()`
 * is forced to the caller's tenant — reads, updates, deletes and creates. (Prisma types still ask for
 * `tenantId` on create; whatever is passed is overwritten with the session tenant.)
 */
export const TENANT_MODELS = new Set<string>([
  "Gym", "Branch", "User", "RoleDefinition", "Staff", "Trainer", "MembershipPlan",
  "Member", "MemberMembership", "Payment", "Invoice", "Refund", "PaymentMethod",
  "Expense", "Attendance", "WorkoutPlan", "WorkoutExercise", "DietPlan", "DietMeal",
  "Measurement", "ProgressPhoto", "Document", "Notification", "Announcement",
  "Reminder", "Referral", "Setting", "Subscription", "SupportTicket", "AuditLog",
]);

type Args = Record<string, unknown> & {
  where?: Record<string, unknown>;
  data?: unknown;
  create?: Record<string, unknown>;
};

const WHERE_OPS = new Set([
  "findMany", "findFirst", "findFirstOrThrow", "findUnique", "findUniqueOrThrow",
  "count", "aggregate", "groupBy", "update", "updateMany", "delete", "deleteMany", "upsert",
]);

/**
 * Returns a Prisma client locked to one tenant. `tenantId` MUST come from the
 * authenticated session (see server/auth/guard.ts) — never from request input.
 */
export function tenantDb(tenantId: string) {
  if (!tenantId) throw new Error("tenantDb: tenantId is required");

  return prisma.$extends(
    Prisma.defineExtension({
      name: "tenant-isolation",
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            if (!TENANT_MODELS.has(model)) return query(args);
            const a = (args ?? {}) as Args;

            if (WHERE_OPS.has(operation)) {
              // Overwrite (not merge) so a caller-supplied tenantId cannot widen scope.
              a.where = { ...(a.where ?? {}), tenantId };
            }
            if (operation === "create") {
              a.data = { ...(a.data as object), tenantId };
            }
            if (operation === "createMany") {
              const d = a.data as object | object[];
              a.data = Array.isArray(d)
                ? d.map((row) => ({ ...row, tenantId }))
                : { ...d, tenantId };
            }
            if (operation === "upsert") {
              a.create = { ...(a.create ?? {}), tenantId };
            }
            return query(a as typeof args);
          },
        },
      },
    }),
  );
}

export type TenantDb = ReturnType<typeof tenantDb>;

/** Interactive-transaction client derived from a tenant-locked client (still tenant-scoped). */
export type TenantTx = Parameters<Parameters<TenantDb["$transaction"]>[0]>[0];

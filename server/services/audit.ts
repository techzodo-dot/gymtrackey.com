import { prisma } from "@/server/db/prisma";
import type { Prisma } from "@prisma/client";

export async function audit(entry: {
  tenantId?: string | null;
  userId?: string | null;
  action: string;
  entity?: string;
  entityId?: string;
  ip?: string | null;
  meta?: Prisma.InputJsonValue;
}) {
  await prisma.auditLog.create({ data: entry });
}

"use server";
import { ZodError } from "zod";
import { revalidatePath } from "next/cache";
import { actionAuth } from "@/server/auth/page";
import { createStaff } from "@/server/services/ops";
import { isPermission } from "@/server/auth/permissions";
import { DomainError } from "@/server/errors";
import { AuthError } from "@/server/auth/guard";
import { audit } from "@/server/services/audit";
import { prisma } from "@/server/db/prisma";
import { str } from "@/server/actions";

export type StaffState = { error?: string; created?: { email: string; tempPassword: string } } | null;

/** Returns the one-time temporary password in the action result — never in a URL. */
export async function createStaffAction(_prev: StaffState, fd: FormData): Promise<StaffState> {
  try {
    const ctx = await actionAuth("staff");
    const perms = fd.getAll("permissions").map(String).filter(isPermission);
    const { user, tempPassword } = await createStaff(ctx as never, { name: str(fd, "name"), email: str(fd, "email").toLowerCase(), phone: str(fd, "phone") || undefined, role: str(fd, "role"), permissions: perms });
    await audit({ tenantId: ctx.tenant.id, userId: ctx.user.id, action: "staff.added", entity: "User", entityId: user.id });
    revalidatePath("/dashboard/staff");
    return { created: { email: user.email, tempPassword } };
  } catch (e) {
    if (e instanceof ZodError) return { error: `${e.issues[0]?.path.join(".") ?? "Input"}: ${e.issues[0]?.message}` };
    if (e instanceof DomainError || e instanceof AuthError) return { error: e.message };
    return { error: "Could not add staff. Please try again." };
  }
}

export async function removeStaffAction(fd: FormData) {
  const ctx = await actionAuth("staff");
  const id = str(fd, "id");
  // Tenant guard: the target must belong to this gym and must not be the owner.
  const u = await ctx.db.user.findFirst({ where: { id, role: { not: "OWNER" } } });
  if (u) {
    await prisma.user.update({ where: { id: u.id }, data: { isActive: false } });
    await audit({ tenantId: ctx.tenant.id, userId: ctx.user.id, action: "staff.removed", entity: "User", entityId: id });
  }
  revalidatePath("/dashboard/staff");
}

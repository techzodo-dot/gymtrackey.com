"use server";
import { act, formObject, str } from "@/server/actions";
import { actionAuth } from "@/server/auth/page";
import { createBranch } from "@/server/services/ops";
import { DomainError } from "@/server/errors";

export async function createBranchAction(fd: FormData) {
  return act("/dashboard/branches", async () => {
    const ctx = await actionAuth("branches", "multiBranch");
    await createBranch(ctx.db, ctx.tenant as never, formObject(fd));
    return `/dashboard/branches?ok=${encodeURIComponent("Branch added.")}`;
  });
}
export async function deactivateBranchAction(fd: FormData) {
  return act("/dashboard/branches", async () => {
    const ctx = await actionAuth("branches");
    const b = await ctx.db.branch.findFirstOrThrow({ where: { id: str(fd, "id") } });
    if (b.isDefault) throw new DomainError("The main branch can't be deactivated.");
    await ctx.db.branch.update({ where: { id: b.id }, data: { isActive: false } });
    return `/dashboard/branches?ok=${encodeURIComponent("Branch deactivated.")}`;
  });
}

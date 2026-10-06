"use server";
import { act, formObject, str } from "@/server/actions";
import { actionAuth } from "@/server/auth/page";
import { createExpense } from "@/server/services/ops";
import { audit } from "@/server/services/audit";

export async function createExpenseAction(fd: FormData) {
  return act("/dashboard/expenses", async () => {
    const ctx = await actionAuth("expenses", "expenses");
    const e = await createExpense(ctx.db, ctx.tenant.id, ctx.user.id, formObject(fd));
    await audit({ tenantId: ctx.tenant.id, userId: ctx.user.id, action: "expense.created", entity: "Expense", entityId: e.id });
    return `/dashboard/expenses?ok=${encodeURIComponent("Expense recorded.")}`;
  });
}
export async function deleteExpenseAction(fd: FormData) {
  return act("/dashboard/expenses", async () => {
    const ctx = await actionAuth("expenses", "expenses");
    await ctx.db.expense.delete({ where: { id: str(fd, "id") } });
    await audit({ tenantId: ctx.tenant.id, userId: ctx.user.id, action: "expense.deleted", entity: "Expense", entityId: str(fd, "id") });
    return `/dashboard/expenses?ok=${encodeURIComponent("Expense deleted.")}`;
  });
}

"use server";
import { act, formObject, str } from "@/server/actions";
import { actionAuth } from "@/server/auth/page";
import { createTrainer } from "@/server/services/ops";

export async function createTrainerAction(fd: FormData) {
  return act("/dashboard/trainers", async () => {
    const ctx = await actionAuth("trainers", "trainers");
    await createTrainer(ctx.db, ctx.tenant.id, formObject(fd));
    return `/dashboard/trainers?ok=${encodeURIComponent("Trainer added.")}`;
  });
}
export async function toggleTrainerAction(fd: FormData) {
  return act("/dashboard/trainers", async () => {
    const ctx = await actionAuth("trainers", "trainers");
    const t = await ctx.db.trainer.findFirstOrThrow({ where: { id: str(fd, "id") } });
    await ctx.db.trainer.update({ where: { id: t.id }, data: { isActive: !t.isActive } });
    return `/dashboard/trainers?ok=${encodeURIComponent(t.isActive ? "Trainer deactivated." : "Trainer activated.")}`;
  });
}

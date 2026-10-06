"use server";
import { act, formObject, str } from "@/server/actions";
import { actionAuth } from "@/server/auth/page";
import { createTicket, replyTicket } from "@/server/services/ops";

export async function createTicketAction(fd: FormData) {
  return act("/dashboard/support", async () => {
    const ctx = await actionAuth("support");
    const t = await createTicket(ctx.db, ctx.tenant.id, ctx.user.id, formObject(fd));
    return `/dashboard/support/${t.id}?ok=${encodeURIComponent("Ticket created. We'll reply soon.")}`;
  });
}
export async function replyAction(fd: FormData) {
  const id = str(fd, "id");
  return act(`/dashboard/support/${id}`, async () => {
    const ctx = await actionAuth("support");
    await replyTicket(ctx.db, id, ctx.user.id, str(fd, "body"));
    return `/dashboard/support/${id}`;
  });
}
export async function closeTicketAction(fd: FormData) {
  const id = str(fd, "id");
  return act(`/dashboard/support/${id}`, async () => {
    const ctx = await actionAuth("support");
    await ctx.db.supportTicket.update({ where: { id }, data: { status: "CLOSED" } });
    return `/dashboard/support?ok=${encodeURIComponent("Ticket closed.")}`;
  });
}

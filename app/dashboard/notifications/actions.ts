"use server";
import { act, formObject } from "@/server/actions";
import { actionAuth } from "@/server/auth/page";
import { sendAnnouncement } from "@/server/services/ops";
import { audit } from "@/server/services/audit";

export async function announceAction(fd: FormData) {
  return act("/dashboard/notifications", async () => {
    const ctx = await actionAuth("notifications");
    const { recipients } = await sendAnnouncement(ctx.db, ctx.tenant.id, ctx.user.id, formObject(fd));
    await audit({ tenantId: ctx.tenant.id, userId: ctx.user.id, action: "announcement.sent", meta: { recipients } });
    return `/dashboard/notifications?ok=${encodeURIComponent(`Announcement sent to ${recipients} member(s).`)}`;
  });
}

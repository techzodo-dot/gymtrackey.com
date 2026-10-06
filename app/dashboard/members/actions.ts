"use server";
import { act, formObject, str } from "@/server/actions";
import { actionAuth } from "@/server/auth/page";
import { assertWithinLimit } from "@/server/services/limits";
import { createMember, updateMember, deactivateMember } from "@/server/services/members";
import { collectPayment } from "@/server/services/payments";
import { freezeMembership, unfreezeMembership, assignMembership } from "@/server/services/memberships";
import { checkIn } from "@/server/services/attendance";
import { sendReminderNow } from "@/server/services/reminders";
import { addMeasurement } from "@/server/services/ops";
import { audit } from "@/server/services/audit";
import { DomainError } from "@/server/errors";
import { AuthError } from "@/server/auth/guard";

export async function createMemberAction(fd: FormData) {
  return act("/dashboard/members/new", async () => {
    const ctx = await actionAuth("members");
    await assertWithinLimit(ctx.tenant, ctx.db, "members");
    const o = formObject(fd);
    const { planId, collect, ...rest } = o;
    const m = await createMember(ctx.db, ctx.tenant.id, rest, { planId });
    if (planId && collect) {
      const plan = await ctx.db.membershipPlan.findFirstOrThrow({ where: { id: planId } });
      // The membership was just created above; collect against it without extending again.
      await collectPayment({ db: ctx.db, tenantId: ctx.tenant.id, userId: ctx.user.id }, { memberId: m.id, amount: String(plan.price / 100), method: collect, notes: "Joining fee" });
    }
    await audit({ tenantId: ctx.tenant.id, userId: ctx.user.id, action: "member.created", entity: "Member", entityId: m.id });
    return `/dashboard/members/${m.id}?ok=${encodeURIComponent("Member added.")}`;
  });
}

export async function updateMemberAction(fd: FormData) {
  const id = str(fd, "id");
  return act(`/dashboard/members/${id}/edit`, async () => {
    const ctx = await actionAuth("members");
    await updateMember(ctx.db, id, formObject(fd));
    await audit({ tenantId: ctx.tenant.id, userId: ctx.user.id, action: "member.updated", entity: "Member", entityId: id });
    return `/dashboard/members/${id}?ok=${encodeURIComponent("Member updated.")}`;
  });
}

export async function deactivateMemberAction(fd: FormData) {
  const id = str(fd, "id");
  return act(`/dashboard/members/${id}`, async () => {
    const ctx = await actionAuth("members");
    await deactivateMember(ctx.db, id);
    await audit({ tenantId: ctx.tenant.id, userId: ctx.user.id, action: "member.deactivated", entity: "Member", entityId: id });
    return `/dashboard/members?ok=${encodeURIComponent("Member deactivated. Their history is kept.")}`;
  });
}

export async function renewAction(fd: FormData) {
  const memberId = str(fd, "memberId");
  return act(`/dashboard/members/${memberId}?tab=membership`, async () => {
    const ctx = await actionAuth("payments");
    const { payment } = await collectPayment({ db: ctx.db, tenantId: ctx.tenant.id, userId: ctx.user.id }, formObject(fd));
    return `/dashboard/payments/${payment.id}?ok=${encodeURIComponent("Membership renewed. Receipt generated.")}`;
  });
}

export async function startMembershipAction(fd: FormData) {
  const memberId = str(fd, "memberId");
  return act(`/dashboard/members/${memberId}?tab=membership`, async () => {
    const ctx = await actionAuth("memberships");
    await ctx.db.$transaction((tx) => assignMembership(tx, ctx.tenant.id, memberId, str(fd, "planId")));
    return `/dashboard/members/${memberId}?tab=membership&ok=${encodeURIComponent("Membership started. Record the payment from the Payments tab.")}`;
  });
}

export async function freezeAction(fd: FormData) {
  const memberId = str(fd, "memberId");
  return act(`/dashboard/members/${memberId}?tab=membership`, async () => {
    const ctx = await actionAuth("memberships");
    await freezeMembership(ctx.db, str(fd, "membershipId"), { from: str(fd, "from"), to: str(fd, "to"), reason: str(fd, "reason") || undefined });
    await audit({ tenantId: ctx.tenant.id, userId: ctx.user.id, action: "membership.frozen", entity: "Member", entityId: memberId });
    return `/dashboard/members/${memberId}?tab=membership&ok=${encodeURIComponent("Membership frozen.")}`;
  });
}

export async function unfreezeAction(fd: FormData) {
  const memberId = str(fd, "memberId");
  return act(`/dashboard/members/${memberId}?tab=membership`, async () => {
    const ctx = await actionAuth("memberships");
    await unfreezeMembership(ctx.db, str(fd, "membershipId"));
    return `/dashboard/members/${memberId}?tab=membership&ok=${encodeURIComponent("Membership resumed.")}`;
  });
}

export async function assignTrainerAction(fd: FormData) {
  const id = str(fd, "id");
  return act(`/dashboard/members/${id}`, async () => {
    const ctx = await actionAuth("members");
    await ctx.db.member.update({ where: { id }, data: { trainerId: str(fd, "trainerId") || null } });
    return `/dashboard/members/${id}?ok=${encodeURIComponent("Trainer updated.")}`;
  });
}

export async function markAttendanceAction(fd: FormData) {
  const id = str(fd, "id");
  return act(`/dashboard/members/${id}`, async () => {
    const ctx = await actionAuth("attendance");
    const r = await checkIn(ctx.db, ctx.tenant.id, id, "MANUAL");
    return `/dashboard/members/${id}?tab=attendance&ok=${encodeURIComponent(r.duplicate ? "Already checked in a moment ago." : "Checked in.")}`;
  });
}

export async function sendReminderAction(fd: FormData) {
  const id = str(fd, "id");
  const back = str(fd, "back") || `/dashboard/members/${id}`;
  return act(back, async () => {
    const ctx = await actionAuth("notifications");
    const res = await sendReminderNow(ctx.db, ctx.tenant.id, id);
    const failed = res.filter((r) => !r.ok).length;
    const msg = res.length === 0 ? "In-app notification created." : failed ? `In-app notification created. ${failed} external message(s) could not be sent — check Settings → Notifications.` : "Reminder sent.";
    return `${back}${back.includes("?") ? "&" : "?"}ok=${encodeURIComponent(msg)}`;
  });
}

export async function addMeasurementAction(fd: FormData) {
  const memberId = str(fd, "memberId");
  return act(`/dashboard/members/${memberId}?tab=measurements`, async () => {
    const ctx = await actionAuth("measurements");
    if (!memberId) throw new DomainError("Choose a member.");
    const trainer = ctx.user.role === "TRAINER" ? await ctx.db.trainer.findFirst({ where: { userId: ctx.user.id } }) : null;
    await addMeasurement(ctx.db, ctx.tenant.id, formObject(fd), trainer?.id);
    return `/dashboard/members/${memberId}?tab=measurements&ok=${encodeURIComponent("Measurement saved.")}`;
  });
}

export async function saveNotesAction(fd: FormData) {
  const id = str(fd, "id");
  return act(`/dashboard/members/${id}?tab=notes`, async () => {
    const ctx = await actionAuth("members");
    await ctx.db.member.update({ where: { id }, data: { notes: str(fd, "notes") || null, medicalNotes: str(fd, "medicalNotes") || null } });
    return `/dashboard/members/${id}?tab=notes&ok=${encodeURIComponent("Notes saved.")}`;
  });
}

export type PortalState = { error?: string; created?: { email: string; tempPassword: string } } | null;
/** One-time temporary password is returned in the action result, never put in a URL. */
export async function grantPortalAccessAction(_prev: PortalState, fd: FormData): Promise<PortalState> {
  try {
    const ctx = await actionAuth("members");
    const { createMemberLogin } = await import("@/server/services/ops");
    const created = await createMemberLogin(ctx.db, ctx.tenant.id, str(fd, "id"));
    await audit({ tenantId: ctx.tenant.id, userId: ctx.user.id, action: "member.portal_access_granted", entity: "Member", entityId: str(fd, "id") });
    return { created };
  } catch (e) {
    return { error: e instanceof DomainError || e instanceof AuthError ? e.message : "Could not create access." };
  }
}

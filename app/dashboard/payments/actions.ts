"use server";
import { act, formObject, str } from "@/server/actions";
import { actionAuth } from "@/server/auth/page";
import { collectPayment, refundPayment } from "@/server/services/payments";
import { DomainError } from "@/server/errors";

export async function collectAction(fd: FormData) {
  const memberId = str(fd, "memberId");
  return act(`/dashboard/payments/new?member=${memberId}`, async () => {
    const ctx = await actionAuth("payments");
    const o = formObject(fd);
    const { payment } = await collectPayment({ db: ctx.db, tenantId: ctx.tenant.id, userId: ctx.user.id }, o);
    return o.status === "PENDING"
      ? `/dashboard/payments?ok=${encodeURIComponent("Due recorded.")}`
      : `/dashboard/payments/${payment.id}?ok=${encodeURIComponent("Payment collected. Invoice and receipt generated.")}`;
  });
}

export async function refundAction(fd: FormData) {
  const id = str(fd, "paymentId");
  return act(`/dashboard/payments/${id}`, async () => {
    const ctx = await actionAuth("payments");
    if (ctx.user.role !== "OWNER" && ctx.user.role !== "MANAGER") throw new DomainError("Only an owner or manager can issue refunds.");
    await refundPayment({ db: ctx.db, tenantId: ctx.tenant.id, userId: ctx.user.id }, formObject(fd));
    return `/dashboard/payments/${id}?ok=${encodeURIComponent("Refund recorded. The original payment is kept for audit.")}`;
  });
}

import { createHmac, timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { DomainError } from "@/server/errors";
import { addDays } from "@/lib/format";
import { logger } from "@/lib/logger";

const keys = () => ({ id: process.env.RAZORPAY_KEY_ID, secret: process.env.RAZORPAY_KEY_SECRET, webhook: process.env.RAZORPAY_WEBHOOK_SECRET });
export const razorpayConfigured = () => { const k = keys(); return !!(k.id && k.secret); };

const safeEq = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};
export const hmac = (secret: string, payload: string) => createHmac("sha256", secret).update(payload).digest("hex");

/** Checkout signature: HMAC_SHA256(order_id|payment_id, key_secret). */
export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string, secret = keys().secret) {
  if (!secret) return false;
  return safeEq(hmac(secret, `${orderId}|${paymentId}`), signature);
}
/** Webhook signature: HMAC_SHA256(raw_body, webhook_secret). Must use the RAW body. */
export function verifyWebhookSignature(rawBody: string, signature: string, secret = keys().webhook) {
  if (!secret || !signature) return false;
  return safeEq(hmac(secret, rawBody), signature);
}

// ── Coupons ──
export async function priceWithCoupon(planCode: string, couponCode?: string, tenantId?: string) {
  const plan = await prisma.subscriptionPlan.findUnique({ where: { code: planCode } });
  if (!plan || !plan.isActive) throw new DomainError("Plan not found.");
  if (plan.isCustom || plan.priceMonthly <= 0) throw new DomainError("This plan is custom-priced. Please contact sales.");
  let discount = 0; let coupon = null;
  if (couponCode) {
    coupon = await prisma.coupon.findUnique({ where: { code: couponCode.trim().toUpperCase() } });
    const now = new Date();
    if (!coupon || !coupon.isActive) throw new DomainError("Invalid coupon code.");
    if (coupon.startsAt && coupon.startsAt > now) throw new DomainError("This coupon is not active yet.");
    if (coupon.expiresAt && coupon.expiresAt < now) throw new DomainError("This coupon has expired.");
    if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) throw new DomainError("This coupon has reached its usage limit.");
    if (coupon.planCodes.length && !coupon.planCodes.includes(planCode)) throw new DomainError("This coupon doesn't apply to the selected plan.");
    if (tenantId && (await prisma.couponRedemption.findUnique({ where: { couponId_tenantId: { couponId: coupon.id, tenantId } } }))) throw new DomainError("You've already used this coupon.");
    discount = coupon.discountType === "PERCENTAGE" ? Math.round((plan.priceMonthly * coupon.discountValue) / 100) : coupon.discountValue;
    if (coupon.maxDiscount != null) discount = Math.min(discount, coupon.maxDiscount);
    discount = Math.min(discount, plan.priceMonthly - 100); // Razorpay minimum ₹1
  }
  return { plan, coupon, discount, payable: plan.priceMonthly - discount };
}

type Fetch = typeof fetch;

/** Creates a Razorpay order server-side. Secrets never reach the browser. Never fakes success. */
export async function createCheckoutOrder(tenantId: string, planCode: string, couponCode?: string, fetchImpl: Fetch = fetch) {
  const k = keys();
  if (!k.id || !k.secret) throw new DomainError("Online payments are not configured yet. Please contact support to upgrade.");
  const { plan, coupon, discount, payable } = await priceWithCoupon(planCode, couponCode, tenantId);

  const res = await fetchImpl("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Basic ${Buffer.from(`${k.id}:${k.secret}`).toString("base64")}` },
    body: JSON.stringify({ amount: payable, currency: plan.currency, receipt: `gt_${tenantId.slice(-8)}_${Date.now()}`, notes: { tenantId, planCode } }),
  });
  if (!res.ok) { logger.error("razorpay.order_failed", { status: res.status }); throw new DomainError("Could not start the payment. Please try again."); }
  const order = (await res.json()) as { id: string };

  await prisma.subscription.create({
    data: { tenantId, planId: plan.id, status: "PENDING", amount: payable, discount, couponCode: coupon?.code, razorpayOrderId: order.id },
  });
  return { orderId: order.id, amount: payable, currency: plan.currency, keyId: k.id, planName: plan.name };
}

/** Idempotent: safe to call from both the browser verify step and the webhook. */
export async function activateSubscription(orderId: string, paymentId: string) {
  const sub = await prisma.subscription.findUnique({ where: { razorpayOrderId: orderId }, include: { plan: true } });
  if (!sub) throw new DomainError("Unknown order.");
  if (sub.status === "ACTIVE" && sub.razorpayPaymentId === paymentId) return { sub, already: true };

  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: sub.tenantId } });
  const prev = await prisma.subscription.findFirst({ where: { tenantId: sub.tenantId, status: "ACTIVE", id: { not: sub.id } }, orderBy: { renewsAt: "desc" } });
  const base = prev?.renewsAt && prev.renewsAt > new Date() && prev.planId === sub.planId ? prev.renewsAt : new Date();
  const renewsAt = addDays(base, 30);

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const s = await tx.subscription.update({ where: { id: sub.id }, data: { status: "ACTIVE", razorpayPaymentId: paymentId, startedAt: new Date(), renewsAt, failureReason: null } });
      await tx.subscription.updateMany({ where: { tenantId: sub.tenantId, status: "ACTIVE", id: { not: sub.id } }, data: { status: "CANCELLED" } });
      await tx.tenant.update({ where: { id: sub.tenantId }, data: { status: "ACTIVE", planCode: sub.plan.code, trialEndsAt: null } });
      if (sub.couponCode) {
        const c = await tx.coupon.findUnique({ where: { code: sub.couponCode } });
        if (c) { await tx.couponRedemption.upsert({ where: { couponId_tenantId: { couponId: c.id, tenantId: sub.tenantId } }, update: {}, create: { couponId: c.id, tenantId: sub.tenantId } }); await tx.coupon.update({ where: { id: c.id }, data: { usedCount: { increment: 1 } } }); }
      }
      await tx.auditLog.create({ data: { tenantId: sub.tenantId, action: "subscription.activated", entity: "Subscription", entityId: sub.id, meta: { plan: sub.plan.code, paymentId } } });
      return s;
    });
    void tenant;
    return { sub: updated, already: false };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { sub, already: true }; // payment id already used
    throw e;
  }
}

export async function verifyAndActivate(tenantId: string, orderId: string, paymentId: string, signature: string) {
  const sub = await prisma.subscription.findUnique({ where: { razorpayOrderId: orderId } });
  if (!sub || sub.tenantId !== tenantId) throw new DomainError("Unknown order.");
  if (!verifyCheckoutSignature(orderId, paymentId, signature)) {
    await prisma.subscription.update({ where: { id: sub.id }, data: { failureReason: "signature_mismatch" } });
    throw new DomainError("Payment verification failed. If money was deducted it will be refunded automatically.");
  }
  return activateSubscription(orderId, paymentId);
}

type RzpEvent = { event: string; payload?: { payment?: { entity?: { id: string; order_id?: string; error_description?: string } }; refund?: { entity?: { payment_id?: string } } } };

/** Webhook entry. Signature must be verified by the caller against the raw body first. */
export async function processWebhook(eventId: string, event: RzpEvent) {
  try {
    await prisma.webhookEvent.create({ data: { id: eventId, provider: "razorpay", type: event.event, payload: event as unknown as Prisma.InputJsonValue } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { duplicate: true }; // already processed
    throw e;
  }
  const pay = event.payload?.payment?.entity;
  switch (event.event) {
    case "payment.captured":
    case "order.paid":
      if (pay?.order_id) await activateSubscription(pay.order_id, pay.id);
      break;
    case "payment.failed":
      if (pay?.order_id) {
        const sub = await prisma.subscription.findUnique({ where: { razorpayOrderId: pay.order_id } });
        if (sub && sub.status === "PENDING") await prisma.subscription.update({ where: { id: sub.id }, data: { failureReason: pay.error_description ?? "payment_failed" } });
        if (sub) await prisma.tenant.updateMany({ where: { id: sub.tenantId, status: "ACTIVE" }, data: { status: "PAST_DUE" } });
        logger.warn("razorpay.payment_failed", { orderId: pay.order_id });
      }
      break;
    case "refund.processed": {
      const pid = event.payload?.refund?.entity?.payment_id;
      if (pid) await prisma.subscription.updateMany({ where: { razorpayPaymentId: pid }, data: { failureReason: "refunded" } });
      break;
    }
  }
  return { duplicate: false };
}

/** Owner cancels auto-renewal: access continues until the paid period ends. */
export async function cancelSubscription(tenantId: string) {
  const sub = await prisma.subscription.findFirst({ where: { tenantId, status: "ACTIVE" } });
  if (!sub) throw new DomainError("No active subscription to cancel.");
  await prisma.subscription.update({ where: { id: sub.id }, data: { status: "CANCELLED" } });
  await prisma.tenant.update({ where: { id: tenantId }, data: { status: "CANCELLED" } });
  await prisma.auditLog.create({ data: { tenantId, action: "subscription.cancelled", entity: "Subscription", entityId: sub.id } });
}

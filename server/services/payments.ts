import { Prisma, type PaymentMethodType } from "@prisma/client";
import { z } from "zod";
import type { TenantDb, TenantTx } from "@/server/db/tenant";
import { DomainError } from "@/server/errors";
import { rupeesToMinor, addDays, startOfDay } from "@/lib/format";
import { assignMembership } from "./memberships";

export const METHODS = ["CASH", "UPI", "CARD", "BANK_TRANSFER", "CHEQUE", "ONLINE"] as const;

const blank = (v: unknown) => (v === "" || v == null ? undefined : v);
export const collectInput = z.object({
  memberId: z.string().min(1),
  planId: z.preprocess(blank, z.string().optional()), // renew / start this plan
  paymentId: z.preprocess(blank, z.string().optional()), // settle an existing pending payment
  amount: z.coerce.number().min(0).max(10_000_000),
  discount: z.preprocess(blank, z.coerce.number().min(0).default(0)),
  method: z.enum(METHODS),
  status: z.enum(["PAID", "PENDING"]).default("PAID"),
  paidAt: z.preprocess(blank, z.coerce.date().optional()),
  dueDate: z.preprocess(blank, z.coerce.date().optional()),
  notes: z.string().trim().max(500).optional(),
});

type TaxSetting = { gstEnabled?: boolean; gstPct?: number; interState?: boolean };

export function computeTax(taxable: number, s: TaxSetting) {
  if (!s.gstEnabled) return { tax: 0, cgst: 0, sgst: 0, igst: 0 };
  const tax = Math.round((taxable * (s.gstPct ?? 18)) / 100);
  if (s.interState) return { tax, cgst: 0, sgst: 0, igst: tax };
  const cgst = Math.floor(tax / 2);
  return { tax, cgst, sgst: tax - cgst, igst: 0 };
}

export function formatInvoiceNumber(prefix: string, year: number, seq: number) {
  return `${prefix}-${year}-${String(seq).padStart(6, "0")}`;
}

async function nextInvoiceNumber(tx: TenantTx, prefix: string) {
  const year = new Date().getFullYear();
  const last = await tx.invoice.findFirst({
    where: { number: { startsWith: `${prefix}-${year}-` } },
    orderBy: { number: "desc" }, select: { number: true },
  });
  const seq = last ? Number(last.number.split("-").pop()) + 1 : 1;
  return formatInvoiceNumber(prefix, year, seq);
}

/**
 * Collect a payment: creates payment + invoice, extends/starts the membership,
 * raises a notification and an audit entry — atomically. Retries on invoice-number races.
 */
export async function collectPayment(
  ctx: { db: TenantDb; tenantId: string; userId: string; ip?: string | null },
  raw: unknown,
) {
  const i = collectInput.parse(raw);
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await ctx.db.$transaction(async (tx) => {
        const member = await tx.member.findFirst({ where: { id: i.memberId, deletedAt: null } });
        if (!member) throw new DomainError("Member not found.");

        const gym = await tx.gym.findFirst();
        const taxSetting = ((await tx.setting.findFirst({ where: { key: "tax" } }))?.value ?? {}) as TaxSetting;

        const amount = rupeesToMinor(i.amount);
        const discount = rupeesToMinor(i.discount);
        if (discount > amount) throw new DomainError("Discount cannot exceed the amount.");
        const { tax, cgst, sgst, igst } = computeTax(amount - discount, taxSetting);
        const finalAmount = amount - discount + tax;

        let membershipId: string | undefined;
        if (i.planId && i.status === "PAID") {
          membershipId = (await assignMembership(tx, ctx.tenantId, member.id, i.planId)).id;
        }

        const common = {
          memberId: member.id, membershipId, amount, discount, tax, finalAmount, method: i.method as PaymentMethodType,
          notes: i.notes, collectedById: ctx.userId, branchId: member.branchId,
        };

        if (i.status === "PENDING") {
          const p = await tx.payment.create({ data: { ...common, tenantId: ctx.tenantId, status: "PENDING", dueDate: i.dueDate ?? addDays(new Date(), 7) } });
          await tx.auditLog.create({ data: { tenantId: ctx.tenantId, userId: ctx.userId, action: "payment.due_recorded", entity: "Payment", entityId: p.id, ip: ctx.ip } });
          return { payment: p, invoice: null };
        }

        let payment;
        if (i.paymentId) {
          const existing = await tx.payment.findFirst({ where: { id: i.paymentId, memberId: member.id, status: { in: ["PENDING", "OVERDUE"] } } });
          if (!existing) throw new DomainError("That pending payment was not found.");
          payment = await tx.payment.update({ where: { id: existing.id }, data: { ...common, status: "PAID", paidAt: i.paidAt ?? new Date() } });
        } else {
          payment = await tx.payment.create({ data: { ...common, tenantId: ctx.tenantId, status: "PAID", paidAt: i.paidAt ?? new Date() } });
        }

        const number = await nextInvoiceNumber(tx, gym?.invoicePrefix ?? "GT");
        const invoice = await tx.invoice.create({
          data: { tenantId: ctx.tenantId, memberId: member.id, paymentId: payment.id, number, subtotal: amount, discount, cgst, sgst, igst, total: finalAmount },
        });
        await tx.notification.create({
          data: { tenantId: ctx.tenantId, memberId: member.id, type: "PAYMENT_RECEIVED", title: "Payment received",
            body: `Payment of ₹${(finalAmount / 100).toLocaleString("en-IN")} received (${number}).` },
        });
        await tx.auditLog.create({ data: { tenantId: ctx.tenantId, userId: ctx.userId, action: "payment.collected", entity: "Payment", entityId: payment.id, ip: ctx.ip, meta: { invoice: number, finalAmount } } });
        return { payment, invoice };
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue; // invoice number race → retry
      throw e;
    }
  }
  throw new DomainError("Could not allocate an invoice number. Please retry.");
}

export const refundInput = z.object({ paymentId: z.string().min(1), amount: z.coerce.number().positive(), reason: z.string().trim().min(3).max(300) });

/** Records a refund against a payment. The original payment is never deleted. */
export async function refundPayment(ctx: { db: TenantDb; tenantId: string; userId: string }, raw: unknown) {
  const i = refundInput.parse(raw);
  return ctx.db.$transaction(async (tx) => {
    const p = await tx.payment.findFirst({ where: { id: i.paymentId }, include: { refunds: true } });
    if (!p) throw new DomainError("Payment not found.");
    if (p.status !== "PAID" && p.status !== "PARTIAL") throw new DomainError("Only paid payments can be refunded.");
    const already = p.refunds.filter((r) => r.status !== "REJECTED").reduce((s, r) => s + r.amount, 0);
    const amount = rupeesToMinor(i.amount);
    if (amount + already > p.finalAmount) throw new DomainError("Refund exceeds the amount paid.");
    const r = await tx.refund.create({ data: { tenantId: ctx.tenantId, paymentId: p.id, amount, reason: i.reason, status: "PROCESSED", requestedById: ctx.userId, approvedById: ctx.userId } });
    if (amount + already >= p.finalAmount) await tx.payment.update({ where: { id: p.id }, data: { status: "REFUNDED" } });
    await tx.auditLog.create({ data: { tenantId: ctx.tenantId, userId: ctx.userId, action: "payment.refunded", entity: "Payment", entityId: p.id, meta: { amount } } });
    return r;
  });
}

/** Fee-due buckets for the payments page and dashboard. */
export async function getDues(db: TenantDb) {
  const today = startOfDay();
  const d1 = addDays(today, 1), d2 = addDays(today, 2), d7 = addDays(today, 8);
  const include = { member: true, plan: true } as const;
  const base = { status: { in: ["ACTIVE", "FROZEN"] as ("ACTIVE" | "FROZEN")[] } };
  const [dueToday, dueTomorrow, dueWeek, expired, pending] = await Promise.all([
    db.memberMembership.findMany({ where: { ...base, endDate: { gte: today, lt: d1 } }, include, orderBy: { endDate: "asc" } }),
    db.memberMembership.findMany({ where: { ...base, endDate: { gte: d1, lt: d2 } }, include, orderBy: { endDate: "asc" } }),
    db.memberMembership.findMany({ where: { ...base, endDate: { gte: d2, lt: d7 } }, include, orderBy: { endDate: "asc" } }),
    // Overdue: lapsed memberships whose member has not renewed since.
    db.memberMembership.findMany({
      where: { status: { in: ["ACTIVE", "EXPIRED"] }, endDate: { lt: today }, member: { deletedAt: null, memberships: { none: { endDate: { gte: today }, status: { in: ["ACTIVE", "FROZEN", "PENDING"] } } } } },
      include, orderBy: { endDate: "desc" }, take: 100,
    }),
    db.payment.findMany({ where: { status: { in: ["PENDING", "OVERDUE"] } }, include: { member: true }, orderBy: { dueDate: "asc" }, take: 100 }),
  ]);
  // De-duplicate overdue per member (keep the latest lapsed term).
  const seen = new Set<string>();
  const overdue = expired.filter((m) => (seen.has(m.memberId) ? false : (seen.add(m.memberId), true)));
  return { dueToday, dueTomorrow, dueWeek, overdue, pending };
}

import { beforeAll, describe, expect, it } from "vitest";
import { makeGym, prisma } from "./helpers";
import { tenantDb } from "@/server/db/tenant";
import { createMember } from "@/server/services/members";
import { createPlan, freezeMembership } from "@/server/services/memberships";
import { collectPayment, computeTax, formatInvoiceNumber, getDues, refundPayment } from "@/server/services/payments";
import { checkIn } from "@/server/services/attendance";
import { assertWithinLimit } from "@/server/services/limits";
import { LimitError, DomainError } from "@/server/errors";
import { addDays } from "@/lib/format";

let A: Awaited<ReturnType<typeof makeGym>>;
let B: Awaited<ReturnType<typeof makeGym>>;
let planId: string;
let ctx: { db: ReturnType<typeof tenantDb>; tenantId: string; userId: string };

beforeAll(async () => {
  A = await makeGym("PayA"); B = await makeGym("PayB");
  const db = tenantDb(A.tenant.id);
  ctx = { db, tenantId: A.tenant.id, userId: A.owner.id };
  planId = (await createPlan(db, A.tenant.id, { name: "Monthly", durationDays: 30, price: 1000, freezeDays: 10 })).id;
});

describe("fee calculation", () => {
  it("computes CGST/SGST and IGST", () => {
    expect(computeTax(10000, { gstEnabled: true, gstPct: 18 })).toEqual({ tax: 1800, cgst: 900, sgst: 900, igst: 0 });
    expect(computeTax(10000, { gstEnabled: true, gstPct: 18, interState: true })).toEqual({ tax: 1800, cgst: 0, sgst: 0, igst: 1800 });
    expect(computeTax(10000, { gstEnabled: false })).toEqual({ tax: 0, cgst: 0, sgst: 0, igst: 0 });
  });
  it("formats invoice numbers", () => expect(formatInvoiceNumber("GT", 2026, 1)).toBe("GT-2026-000001"));
});

describe("member + payment workflow", () => {
  it("creates a member with a membership, collects payment, invoices, extends on renewal", async () => {
    const m = await createMember(ctx.db, A.tenant.id, { firstName: "Rahul", lastName: "Kumar", phone: "9000000001" }, { planId });
    const p1 = await collectPayment(ctx, { memberId: m.id, planId, amount: "1000", discount: "100", method: "UPI" });
    expect(p1.payment.finalAmount).toBe(90000);
    expect(p1.invoice?.number).toMatch(/^GT-\d{4}-000001$/);

    const p2 = await collectPayment(ctx, { memberId: m.id, planId, amount: "1000", method: "CASH" });
    expect(p2.invoice?.number).toMatch(/000002$/);
    const ms = await ctx.db.memberMembership.findMany({ where: { memberId: m.id }, orderBy: { startDate: "asc" } });
    expect(ms).toHaveLength(3); // initial + 2 renewals chained
    expect(ms[2]!.startDate.getTime()).toBeGreaterThan(ms[1]!.endDate.getTime() - 1);
  });

  it("records pending dues and settles them", async () => {
    const m = await createMember(ctx.db, A.tenant.id, { firstName: "Sneha", phone: "9000000002" });
    const due = await collectPayment(ctx, { memberId: m.id, amount: "500", method: "CASH", status: "PENDING", dueDate: "2030-01-01" });
    expect(due.invoice).toBeNull();
    expect((await getDues(ctx.db)).pending.map((p) => p.id)).toContain(due.payment.id);
    const settled = await collectPayment(ctx, { memberId: m.id, paymentId: due.payment.id, amount: "500", method: "CASH" });
    expect(settled.payment.status).toBe("PAID");
    expect(settled.invoice).not.toBeNull();
  });

  it("rejects duplicate phones and discounts above the amount", async () => {
    await expect(createMember(ctx.db, A.tenant.id, { firstName: "Dup", phone: "9000000001" })).rejects.toBeInstanceOf(DomainError);
    const m = await ctx.db.member.findFirstOrThrow();
    await expect(collectPayment(ctx, { memberId: m.id, amount: "10", discount: "50", method: "CASH" })).rejects.toBeInstanceOf(DomainError);
  });

  it("refunds without deleting the original payment", async () => {
    const m = await ctx.db.member.findFirstOrThrow({ where: { firstName: "Rahul" } });
    const { payment } = await collectPayment(ctx, { memberId: m.id, amount: "200", method: "CASH" });
    await refundPayment(ctx, { paymentId: payment.id, amount: "200", reason: "Cancelled" });
    const after = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(after.status).toBe("REFUNDED");
    await expect(refundPayment(ctx, { paymentId: payment.id, amount: "1", reason: "again" })).rejects.toBeInstanceOf(DomainError);
  });

  it("transactions stay tenant-scoped: Gym B cannot collect for Gym A's member", async () => {
    const mA = await ctx.db.member.findFirstOrThrow();
    const ctxB = { db: tenantDb(B.tenant.id), tenantId: B.tenant.id, userId: B.owner.id };
    await expect(collectPayment(ctxB, { memberId: mA.id, amount: "100", method: "CASH" })).rejects.toBeInstanceOf(DomainError);
    expect(await prisma.payment.count({ where: { tenantId: B.tenant.id } })).toBe(0);
  });
});

describe("attendance", () => {
  it("checks in active members by code, QR and phone; dedupes quick repeats", async () => {
    const m = await ctx.db.member.findFirstOrThrow({ where: { firstName: "Rahul" } });
    const r1 = await checkIn(ctx.db, A.tenant.id, m.memberCode);
    expect(r1.duplicate).toBe(false);
    expect((await checkIn(ctx.db, A.tenant.id, m.qrToken, "QR")).duplicate).toBe(true);
  });
  it("blocks members without an active membership", async () => {
    const m = await ctx.db.member.findFirstOrThrow({ where: { firstName: "Sneha" } });
    await expect(checkIn(ctx.db, A.tenant.id, m.phone)).rejects.toThrow("Membership expired. Please contact reception.");
  });
  it("cannot check in another gym's member", async () => {
    const mA = await ctx.db.member.findFirstOrThrow();
    await expect(checkIn(tenantDb(B.tenant.id), B.tenant.id, mA.memberCode)).rejects.toThrow("Member not found.");
  });
});

describe("membership expiry & freeze", () => {
  it("freezes and extends end date; enforces plan freeze days", async () => {
    const m = await ctx.db.member.findFirstOrThrow({ where: { firstName: "Rahul" } });
    const ms = await ctx.db.memberMembership.findFirstOrThrow({ where: { memberId: m.id, status: "ACTIVE" }, orderBy: { startDate: "asc" } });
    const f = await freezeMembership(ctx.db, ms.id, { from: new Date(), to: addDays(new Date(), 4), reason: "Travel" });
    expect(f.status).toBe("FROZEN");
    expect(f.endDate.getTime()).toBe(ms.endDate.getTime() + 5 * 86_400_000);
  });
});

describe("plan limits (server-enforced)", () => {
  it("blocks adding members beyond the plan limit", async () => {
    const T = await makeGym("Lim");
    await prisma.subscriptionPlan.update({ where: { code: "starter" }, data: { memberLimit: 2 } });
    const db = tenantDb(T.tenant.id);
    for (const p of ["9100000001", "9100000002"]) await createMember(db, T.tenant.id, { firstName: "X", phone: p });
    await expect(assertWithinLimit(T.tenant, db, "members")).rejects.toBeInstanceOf(LimitError);
    await prisma.subscriptionPlan.update({ where: { code: "starter" }, data: { memberLimit: 100 } });
  });
});

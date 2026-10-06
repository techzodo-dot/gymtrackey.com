import { beforeAll, describe, expect, it } from "vitest";
import { makeGym, prisma } from "./helpers";
import { ensurePlans } from "@/server/services/plans";
import { activateSubscription, createCheckoutOrder, hmac, priceWithCoupon, processWebhook, verifyAndActivate, verifyCheckoutSignature, verifyWebhookSignature } from "@/server/services/billing";
import { runDailyJobs } from "@/server/services/jobs";
import { loadSampleData } from "@/server/services/sample-data";
import { tenantDb } from "@/server/db/tenant";
import { DomainError } from "@/server/errors";

process.env.RAZORPAY_KEY_ID = "rzp_test_x"; process.env.RAZORPAY_KEY_SECRET = "key_secret_123"; process.env.RAZORPAY_WEBHOOK_SECRET = "whsec_456";

const fakeFetch = (id: string) => (async () => new Response(JSON.stringify({ id }), { status: 200 })) as unknown as typeof fetch;
let n = 0;
const order = () => `order_T${Date.now()}${n++}`;

beforeAll(async () => { await ensurePlans(); });

describe("razorpay signatures", () => {
  it("verifies checkout and webhook signatures, rejects tampering", () => {
    const sig = hmac("key_secret_123", "order_1|pay_1");
    expect(verifyCheckoutSignature("order_1", "pay_1", sig)).toBe(true);
    expect(verifyCheckoutSignature("order_1", "pay_2", sig)).toBe(false);
    expect(verifyCheckoutSignature("order_1", "pay_1", "bad")).toBe(false);
    const body = '{"event":"payment.captured"}';
    expect(verifyWebhookSignature(body, hmac("whsec_456", body))).toBe(true);
    expect(verifyWebhookSignature(body + " ", hmac("whsec_456", body))).toBe(false);
    expect(verifyWebhookSignature(body, "")).toBe(false);
  });
});

describe("subscription checkout", () => {
  it("creates an order, verifies, activates the plan and is idempotent", async () => {
    const G = await makeGym("Bill");
    const oid = order();
    const o = await createCheckoutOrder(G.tenant.id, "growth", undefined, fakeFetch(oid));
    expect(o.amount).toBe(99900);
    await expect(verifyAndActivate(G.tenant.id, oid, "pay_A", "forged")).rejects.toBeInstanceOf(DomainError);
    expect((await prisma.tenant.findUniqueOrThrow({ where: { id: G.tenant.id } })).status).toBe("TRIAL");

    await verifyAndActivate(G.tenant.id, oid, "pay_A" + oid, hmac("key_secret_123", `${oid}|pay_A${oid}`));
    const t = await prisma.tenant.findUniqueOrThrow({ where: { id: G.tenant.id } });
    expect(t.status).toBe("ACTIVE"); expect(t.planCode).toBe("growth");
    const again = await activateSubscription(oid, "pay_A" + oid);
    expect(again.already).toBe(true);
    expect(await prisma.subscription.count({ where: { tenantId: G.tenant.id, status: "ACTIVE" } })).toBe(1);
  });

  it("another gym cannot verify someone else's order", async () => {
    const G1 = await makeGym("Bill1"), G2 = await makeGym("Bill2");
    const oid = order();
    await createCheckoutOrder(G1.tenant.id, "starter", undefined, fakeFetch(oid));
    await expect(verifyAndActivate(G2.tenant.id, oid, "p", hmac("key_secret_123", `${oid}|p`))).rejects.toBeInstanceOf(DomainError);
  });

  it("webhook is idempotent and handles failures", async () => {
    const G = await makeGym("Hook");
    const oid = order();
    await createCheckoutOrder(G.tenant.id, "professional", undefined, fakeFetch(oid));
    const evt = { event: "payment.captured", payload: { payment: { entity: { id: "pay_" + oid, order_id: oid } } } };
    const eid = "evt_" + oid;
    expect((await processWebhook(eid, evt)).duplicate).toBe(false);
    expect((await processWebhook(eid, evt)).duplicate).toBe(true);
    expect((await prisma.tenant.findUniqueOrThrow({ where: { id: G.tenant.id } })).planCode).toBe("professional");
    await processWebhook("evt_f" + oid, { event: "payment.failed", payload: { payment: { entity: { id: "pay_f", order_id: oid, error_description: "declined" } } } });
    expect((await prisma.tenant.findUniqueOrThrow({ where: { id: G.tenant.id } })).status).toBe("PAST_DUE");
  });

  it("refuses to fake success when Razorpay isn't configured", async () => {
    const G = await makeGym("NoKeys");
    const k = process.env.RAZORPAY_KEY_ID; delete process.env.RAZORPAY_KEY_ID;
    await expect(createCheckoutOrder(G.tenant.id, "starter")).rejects.toThrow(/not configured/);
    process.env.RAZORPAY_KEY_ID = k;
  });
});

describe("coupons", () => {
  it("applies percentage with cap, enforces expiry & plan scope", async () => {
    await prisma.coupon.deleteMany({ where: { code: { in: ["SAVE20", "OLD"] } } }); // test DB persists between runs
    await prisma.coupon.create({ data: { code: "SAVE20", discountType: "PERCENTAGE", discountValue: 20, maxDiscount: 15000, planCodes: ["growth"] } });
    await prisma.coupon.create({ data: { code: "OLD", discountType: "FIXED", discountValue: 100, expiresAt: new Date(Date.now() - 1000) } });
    const r = await priceWithCoupon("growth", "save20");
    expect(r.discount).toBe(15000); expect(r.payable).toBe(84900);
    await expect(priceWithCoupon("starter", "SAVE20")).rejects.toThrow(/doesn't apply/);
    await expect(priceWithCoupon("growth", "OLD")).rejects.toThrow(/expired/);
    await expect(priceWithCoupon("growth", "NOPE")).rejects.toThrow(/Invalid/);
  });
});

describe("daily jobs & sample data", () => {
  it("expires trials, lapsed memberships and creates reminders", async () => {
    const G = await makeGym("Job");
    const old = await makeGym("Trial");
    await prisma.tenant.update({ where: { id: old.tenant.id }, data: { trialEndsAt: new Date(Date.now() - 86_400_000) } });
    await loadSampleData(G.tenant.id, { members: 20 });
    const db = tenantDb(G.tenant.id);
    expect(await db.member.count()).toBe(20);
    expect(await db.trainer.count()).toBe(5);
    expect(await db.payment.count()).toBeGreaterThan(10);
    // force an active membership into the past, run the job
    const ms = await db.memberMembership.findFirstOrThrow({ where: { status: "ACTIVE" } });
    await db.memberMembership.update({ where: { id: ms.id }, data: { endDate: new Date(Date.now() - 3 * 86_400_000) } });
    const res = await runDailyJobs();
    expect(res.expiredMemberships).toBeGreaterThanOrEqual(1);
    expect((await prisma.tenant.findUniqueOrThrow({ where: { id: old.tenant.id } })).status).toBe("EXPIRED");
    expect((await db.memberMembership.findUniqueOrThrow({ where: { id: ms.id } })).status).toBe("EXPIRED");
    // idempotent
    const again = await runDailyJobs();
    expect(again.expiredMemberships).toBe(0);
  });
});

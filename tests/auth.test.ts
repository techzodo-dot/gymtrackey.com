import { describe, expect, it } from "vitest";
import { makeGym, prisma } from "./helpers";
import { hashPassword, hashToken, newResetToken, verifyPassword } from "@/server/auth/password";
import { readSession, signSession } from "@/server/auth/session";
import { EmailTakenError, registerGym, trialDaysLeft } from "@/server/services/registration";
import { registerSchema } from "@/lib/validation";
import { rateLimit, _resetRateLimits } from "@/server/auth/rate-limit";

describe("registration", () => {
  it("creates tenant, gym, default branch, owner, settings and a 14-day trial", async () => {
    const { tenant, owner, branch } = await makeGym("Reg");
    expect(tenant.status).toBe("TRIAL");
    expect(trialDaysLeft(tenant.trialEndsAt)).toBe(14);
    expect(owner.role).toBe("OWNER");
    expect(owner.tenantId).toBe(tenant.id);
    expect(branch.isDefault).toBe(true);
    expect(await prisma.gym.count({ where: { tenantId: tenant.id } })).toBe(1);
    expect(await prisma.setting.count({ where: { tenantId: tenant.id } })).toBeGreaterThan(0);
    expect(await prisma.subscription.count({ where: { tenantId: tenant.id, status: "TRIAL" } })).toBe(1);
  });

  it("stores only a bcrypt hash and rejects duplicate emails", async () => {
    const { owner, email } = await makeGym("Dup");
    expect(owner.passwordHash).not.toContain("Str0ngPassword!");
    await expect(
      registerGym({ gymName: "Other", ownerName: "X Y", email, phone: "+91 9876543210",
        password: "Str0ngPassword!", city: "Kolar", state: "KA", country: "India" }),
    ).rejects.toBeInstanceOf(EmailTakenError);
  });

  it("validates input", () => {
    expect(registerSchema.safeParse({ gymName: "G", ownerName: "O", email: "nope", phone: "1", password: "weak", city: "", state: "", }).success).toBe(false);
  });
});

describe("passwords & sessions", () => {
  it("hashes and verifies", async () => {
    const h = await hashPassword("Correct Horse 9");
    expect(await verifyPassword("Correct Horse 9", h)).toBe(true);
    expect(await verifyPassword("wrong", h)).toBe(false);
  });
  it("round-trips a signed session and rejects tampering", async () => {
    const t = await signSession({ uid: "u1", role: "OWNER", tid: "t1" });
    expect(await readSession(t)).toEqual({ uid: "u1", role: "OWNER", tid: "t1" });
    expect(await readSession(t.slice(0, -2) + "xx")).toBeNull();
    expect(await readSession(undefined)).toBeNull();
  });
  it("reset tokens are stored hashed", () => {
    const { raw, hash } = newResetToken();
    expect(hash).toBe(hashToken(raw));
    expect(hash).not.toBe(raw);
  });
});

describe("rate limiting", () => {
  it("blocks after the limit", () => {
    _resetRateLimits();
    for (let i = 0; i < 3; i++) expect(rateLimit("k", 3, 1000).ok).toBe(true);
    expect(rateLimit("k", 3, 1000).ok).toBe(false);
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "./helpers";
import { POST } from "@/app/api/setup/route";
import { verifyPassword } from "@/server/auth/password";
import { _resetRateLimits } from "@/server/auth/rate-limit";

const post = (b: unknown) => POST(new Request("http://localhost/api/setup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) }));
const email = () => `root${Date.now()}${Math.random().toString(36).slice(2, 6)}@example.com`;

describe("first-admin bootstrap", () => {
  beforeEach(() => { _resetRateLimits(); delete process.env.SETUP_TOKEN; });

  it("is disabled without SETUP_TOKEN", async () => {
    expect((await post({ token: "x", email: email(), password: "Str0ngPassword1" })).status).toBe(404);
  });

  it("rejects a wrong token and creates nothing", async () => {
    process.env.SETUP_TOKEN = "correct-horse-battery";
    const e = email();
    expect((await post({ token: "wrong-token-value", email: e, password: "Str0ngPassword1" })).status).toBe(403);
    expect(await prisma.user.findUnique({ where: { email: e } })).toBeNull();
  });

  it("creates the first super admin once, then locks", async () => {
    process.env.SETUP_TOKEN = "correct-horse-battery";
    await prisma.user.deleteMany({ where: { role: "SUPER_ADMIN" } }); // test DB only
    const e = email();
    expect((await post({ token: "correct-horse-battery", email: e, password: "weak" })).status).toBe(422);
    expect((await post({ token: "correct-horse-battery", email: e, password: "Str0ngPassword1" })).status).toBe(201);
    const u = await prisma.user.findUniqueOrThrow({ where: { email: e } });
    expect(u.role).toBe("SUPER_ADMIN"); expect(u.tenantId).toBeNull();
    expect(await verifyPassword("Str0ngPassword1", u.passwordHash)).toBe(true);
    expect((await post({ token: "correct-horse-battery", email: email(), password: "Str0ngPassword1" })).status).toBe(403); // already set up
  });
});

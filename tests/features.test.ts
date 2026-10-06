import { beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { addMember, makeGym, prisma } from "./helpers";
import { tenantDb } from "@/server/db/tenant";
import { createMember, commitImport, previewImport } from "@/server/services/members";
import { createPlan } from "@/server/services/memberships";
import { createMemberLogin, createStaff, createTicket, replyTicket, sendAnnouncement } from "@/server/services/ops";
import { runReminderEngine } from "@/server/services/reminders";
import { renderTemplate } from "@/server/services/messaging";
import { assertMemberCapacity, featureEnabled } from "@/server/services/limits";
import { activateTenant, extendTrial } from "@/server/services/platform";
import { ensurePlans } from "@/server/services/plans";
import { parseCsv, toCsv } from "@/lib/format";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { signSession } from "@/server/auth/session";
import { middleware } from "@/middleware";
import { POST as forgot } from "@/app/api/auth/forgot/route";
import { POST as reset } from "@/app/api/auth/reset/route";
import { DomainError, LimitError } from "@/server/errors";
import { _resetRateLimits } from "@/server/auth/rate-limit";

let A: Awaited<ReturnType<typeof makeGym>>, B: Awaited<ReturnType<typeof makeGym>>;
beforeAll(async () => { await ensurePlans(); A = await makeGym("FA"); B = await makeGym("FB"); });

const post = (url: string, body: unknown) => new Request(`http://localhost${url}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

describe("CSV", () => {
  it("round-trips quotes/commas and neutralises formula injection", () => {
    const csv = toCsv([["a", 'he said "hi", ok'], ["=cmd|' /C calc'!A0", "x"]]);
    expect(parseCsv(csv)[0]).toEqual(["a", 'he said "hi", ok']);
    expect(parseCsv(csv)[1]![0]!.startsWith("'=")).toBe(true);
  });
});

describe("member import", () => {
  it("separates valid / invalid / duplicate rows and imports only valid ones within the tenant", async () => {
    const db = tenantDb(A.tenant.id);
    await createMember(db, A.tenant.id, { firstName: "Existing", phone: "9555000001" });
    const csv = parseCsv("name,phone,email,gender\nNew One,9555000002,n1@example.com,male\n,9555000003,,\nBad Phone,12,,\nDup Existing,9555000001,,\nSame File,9555000002,,\nBad Email,9555000004,not-an-email,");
    const prev = await previewImport(db, csv);
    expect(prev.valid.map((v) => v.data.phone)).toEqual(["9555000002"]);
    expect(prev.invalid).toHaveLength(3);
    expect(prev.duplicate).toHaveLength(2);
    expect(await commitImport(db, A.tenant.id, prev)).toBe(1);
    expect(await prisma.member.count({ where: { tenantId: B.tenant.id, phone: "9555000002" } })).toBe(0);
  });
  it("rejects a file without name/phone columns and enforces capacity", async () => {
    const db = tenantDb(A.tenant.id);
    await expect(previewImport(db, parseCsv("foo,bar\n1,2"))).rejects.toBeInstanceOf(DomainError);
    await prisma.subscriptionPlan.update({ where: { code: "starter" }, data: { memberLimit: 1 } });
    await expect(assertMemberCapacity(A.tenant, db, 5)).rejects.toBeInstanceOf(LimitError);
    await prisma.subscriptionPlan.update({ where: { code: "starter" }, data: { memberLimit: 100 } });
  });
});

describe("member portal isolation", () => {
  it("a member login resolves only their own record; other members/gyms are unreachable", async () => {
    const dbA = tenantDb(A.tenant.id);
    const m1 = await createMember(dbA, A.tenant.id, { firstName: "Mem", lastName: "One", phone: "9555100001", email: `m1${Date.now()}@example.com` });
    const m2 = await createMember(dbA, A.tenant.id, { firstName: "Mem", lastName: "Two", phone: "9555100002" });
    const mB = await addMember(B.tenant.id, "OtherGym");
    const { email, tempPassword } = await createMemberLogin(dbA, A.tenant.id, m1.id);
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(user.role).toBe("MEMBER");
    expect(await verifyPassword(tempPassword, user.passwordHash)).toBe(true);
    const mine = await tenantDb(user.tenantId!).member.findFirst({ where: { userId: user.id } });
    expect(mine?.id).toBe(m1.id);
    // Portal queries add `memberId: me.id`; foreign ids simply don't match.
    const p = await dbA.payment.create({ data: { tenantId: A.tenant.id, memberId: m2.id, amount: 1, finalAmount: 1, method: "CASH", status: "PAID" } });
    expect(await tenantDb(user.tenantId!).payment.findFirst({ where: { id: p.id, memberId: mine!.id } })).toBeNull();
    expect(await tenantDb(user.tenantId!).member.findFirst({ where: { id: mB.id } })).toBeNull();
    await expect(createMemberLogin(dbA, A.tenant.id, m1.id)).rejects.toThrow(/already has portal access/);
  });
});

describe("middleware role gate", () => {
  const hit = async (role: "OWNER" | "MEMBER" | "SUPER_ADMIN" | "TRAINER", path: string) => {
    const token = await signSession({ uid: "u", role, tid: role === "SUPER_ADMIN" ? null : "t" });
    return middleware(new NextRequest(`http://localhost${path}`, { headers: { cookie: `gt_session=${token}` } }));
  };
  it("gym staff cannot reach /admin; members cannot reach /dashboard; super admin cannot use /dashboard", async () => {
    expect((await hit("OWNER", "/admin"))?.headers.get("location")).toMatch(/\/dashboard$/);
    expect((await hit("TRAINER", "/admin/gyms"))?.headers.get("location")).toMatch(/\/trainer$/);
    expect((await hit("MEMBER", "/dashboard/payments"))?.headers.get("location")).toMatch(/\/member$/);
    expect((await hit("SUPER_ADMIN", "/dashboard"))?.headers.get("location")).toMatch(/\/admin$/);
    expect((await hit("OWNER", "/dashboard"))?.headers.get("location")).toBeNull();
  });
  it("anonymous users are sent to login with ?next", async () => {
    const res = await middleware(new NextRequest("http://localhost/dashboard/members"));
    expect(res?.headers.get("location")).toContain("/login?next=%2Fdashboard%2Fmembers");
  });
  it("rejects forged/garbage session cookies", async () => {
    const res = await middleware(new NextRequest("http://localhost/admin", { headers: { cookie: "gt_session=abc.def.ghi" } }));
    expect(res?.headers.get("location")).toContain("/login");
  });
});

describe("password reset", () => {
  it("issues a hashed single-use token and changes the password once", async () => {
    _resetRateLimits();
    const logs: string[] = []; const orig = console.log; console.log = (m: string) => logs.push(m);
    const prevEnv = process.env.NODE_ENV; (process.env as Record<string, string>).NODE_ENV = "development";
    await forgot(post("/api/auth/forgot", { email: A.email }));
    (process.env as Record<string, string>).NODE_ENV = prevEnv!; console.log = orig;
    const rec = await prisma.passwordResetToken.findFirstOrThrow({ where: { userId: A.owner.id }, orderBy: { createdAt: "desc" } });
    expect(rec.tokenHash).toHaveLength(64); // sha256 hex, never the raw token
    // We can't read the raw token from the hash, so mint a known one the same way the route does.
    const { newResetToken } = await import("@/server/auth/password");
    const t = newResetToken();
    await prisma.passwordResetToken.create({ data: { userId: A.owner.id, tokenHash: t.hash, expiresAt: new Date(Date.now() + 60_000) } });
    expect((await reset(post("/api/auth/reset", { token: t.raw, password: "NewStr0ngPass99" }))).status).toBe(200);
    expect(await verifyPassword("NewStr0ngPass99", (await prisma.user.findUniqueOrThrow({ where: { id: A.owner.id } })).passwordHash)).toBe(true);
    expect((await reset(post("/api/auth/reset", { token: t.raw, password: "AnotherStr0ng11" }))).status).toBe(400); // single use
  });
  it("rejects expired tokens, weak passwords and unknown emails look identical", async () => {
    const { newResetToken } = await import("@/server/auth/password");
    const t = newResetToken();
    await prisma.passwordResetToken.create({ data: { userId: A.owner.id, tokenHash: t.hash, expiresAt: new Date(Date.now() - 1000) } });
    expect((await reset(post("/api/auth/reset", { token: t.raw, password: "NewStr0ngPass99" }))).status).toBe(400);
    expect((await reset(post("/api/auth/reset", { token: t.raw + "x", password: "weak" }))).status).toBe(422);
    _resetRateLimits();
    const a = await forgot(post("/api/auth/forgot", { email: A.email })); const b = await forgot(post("/api/auth/forgot", { email: "nobody@example.com" }));
    expect([a.status, await a.json()]).toEqual([b.status, await b.json()]);
  });
});

describe("support, staff, announcements", () => {
  it("tickets are tenant-scoped", async () => {
    const t = await createTicket(tenantDb(A.tenant.id), A.tenant.id, A.owner.id, { subject: "Help me", body: "Please" });
    await expect(replyTicket(tenantDb(B.tenant.id), t.id, B.owner.id, "I should not see this")).rejects.toBeInstanceOf(DomainError);
    await replyTicket(tenantDb(A.tenant.id), t.id, A.owner.id, "Thanks");
    expect(await prisma.supportMessage.count({ where: { ticketId: t.id } })).toBe(2);
  });
  it("staff creation enforces limits, unique emails and returns a temp password that works", async () => {
    const G = await makeGym("Staff");
    const ctx = { db: tenantDb(G.tenant.id), tenant: G.tenant as never };
    const { user, tempPassword } = await createStaff(ctx, { name: "Rita Recep", email: `rita${Date.now()}@example.com`, role: "RECEPTIONIST", permissions: [] });
    expect(await verifyPassword(tempPassword, user.passwordHash)).toBe(true);
    await expect(createStaff(ctx, { name: "Dup", email: user.email, role: "MANAGER", permissions: [] })).rejects.toBeInstanceOf(DomainError);
    await prisma.subscriptionPlan.update({ where: { code: "starter" }, data: { staffLimit: 1 } });
    await expect(createStaff(ctx, { name: "Two", email: `two${Date.now()}@example.com`, role: "MANAGER", permissions: [] })).rejects.toBeInstanceOf(LimitError);
    await prisma.subscriptionPlan.update({ where: { code: "starter" }, data: { staffLimit: 3 } });
  });
  it("announcements reach only the targeted members of the same gym", async () => {
    const G = await makeGym("Ann"); const db = tenantDb(G.tenant.id);
    const plan = await createPlan(db, G.tenant.id, { name: "Gold", durationDays: 30, price: 100 });
    const m1 = await createMember(db, G.tenant.id, { firstName: "In", phone: "9555200001" }, { planId: plan.id });
    await createMember(db, G.tenant.id, { firstName: "Out", phone: "9555200002" });
    const r = await sendAnnouncement(db, G.tenant.id, G.owner.id, { title: "Hello", body: "Plan only", audience: "MEMBERSHIP_PLAN", targetId: plan.id });
    expect(r.recipients).toBe(1);
    expect((await prisma.notification.findMany({ where: { tenantId: G.tenant.id, type: "ANNOUNCEMENT" } })).map((n) => n.memberId)).toEqual([m1.id]);
  });
});

describe("reminders", () => {
  it("renders templates and sends 3-day reminders once per day", async () => {
    expect(renderTemplate("Hi {{member_name}} pay ₹{{amount}} by {{due_date}}", { member_name: "Rahul", amount: "1,000", due_date: "06 Oct 2026" })).toBe("Hi Rahul pay ₹1,000 by 06 Oct 2026");
    const G = await makeGym("Rem"); const db = tenantDb(G.tenant.id);
    const plan = await createPlan(db, G.tenant.id, { name: "Monthly", durationDays: 30, price: 1000 });
    const m = await createMember(db, G.tenant.id, { firstName: "Soon", phone: "9555300001", email: "soon@example.com" }, { planId: plan.id });
    const ms = await db.memberMembership.findFirstOrThrow({ where: { memberId: m.id } });
    const threeDays = new Date(); threeDays.setHours(12, 0, 0, 0); threeDays.setDate(threeDays.getDate() + 3);
    await db.memberMembership.update({ where: { id: ms.id }, data: { endDate: threeDays } });
    expect(await runReminderEngine(db, G.tenant.id)).toBe(1);
    expect(await runReminderEngine(db, G.tenant.id)).toBe(0); // idempotent
    const n = await prisma.notification.findFirstOrThrow({ where: { tenantId: G.tenant.id, memberId: m.id } });
    expect(n.body).toContain("Soon");
    // No provider is configured in tests: the attempt is recorded honestly as FAILED, never as SENT.
    const rem = await prisma.reminder.findFirstOrThrow({ where: { tenantId: G.tenant.id } });
    expect(rem.status).toBe("FAILED");
  });
});

describe("feature flags & platform admin", () => {
  it("trial gets all features; paid plans follow their flags", async () => {
    const G = await makeGym("Flag");
    expect(await featureEnabled(G.tenant, "trainers")).toBe(true);
    const t = await prisma.tenant.update({ where: { id: G.tenant.id }, data: { status: "ACTIVE", planCode: "starter" } });
    expect(await featureEnabled(t, "trainers")).toBe(false);
    expect(await featureEnabled({ ...t, planCode: "growth" }, "trainers")).toBe(true);
    expect(await featureEnabled({ ...t, planCode: "growth" }, "multiBranch")).toBe(false);
  });
  it("extends trials and re-activates suspended gyms to the right status", async () => {
    const G = await makeGym("Susp");
    await prisma.tenant.update({ where: { id: G.tenant.id }, data: { status: "SUSPENDED" } });
    expect((await activateTenant(G.tenant.id)).status).toBe("TRIAL");
    await prisma.tenant.update({ where: { id: G.tenant.id }, data: { status: "EXPIRED", trialEndsAt: new Date(Date.now() - 1000) } });
    const t = await extendTrial(G.tenant.id, 7);
    expect(t.status).toBe("TRIAL"); expect(t.trialEndsAt!.getTime()).toBeGreaterThan(Date.now() + 6 * 86_400_000);
  });
});

describe("misc", () => { it("hashes verify", async () => expect(await verifyPassword("x", await hashPassword("x"))).toBe(true)); });

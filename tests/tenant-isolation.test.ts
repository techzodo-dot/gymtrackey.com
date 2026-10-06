import { beforeAll, describe, expect, it } from "vitest";
import { addMember, makeGym, prisma } from "./helpers";
import { tenantDb } from "@/server/db/tenant";

let A: Awaited<ReturnType<typeof makeGym>>;
let B: Awaited<ReturnType<typeof makeGym>>;
let memberA: { id: string };
let memberB: { id: string };

beforeAll(async () => {
  A = await makeGym("A");
  B = await makeGym("B");
  memberA = await addMember(A.tenant.id, "Alice");
  memberB = await addMember(B.tenant.id, "Bob");
  await prisma.payment.create({
    data: { tenantId: B.tenant.id, memberId: memberB.id, amount: 1000, finalAmount: 1000, method: "CASH", paidAt: new Date() },
  });
  await prisma.expense.create({
    data: { tenantId: B.tenant.id, category: "RENT", amount: 5000, date: new Date() },
  });
});

describe("tenant isolation (Gym A vs Gym B)", () => {
  it("Gym A cannot list Gym B members", async () => {
    const rows = await tenantDb(A.tenant.id).member.findMany();
    expect(rows.map((r) => r.id)).toEqual([memberA.id]);
  });

  it("Gym A cannot read Gym B member by id", async () => {
    const db = tenantDb(A.tenant.id);
    expect(await db.member.findUnique({ where: { id: memberB.id } })).toBeNull();
    expect(await db.member.findFirst({ where: { id: memberB.id } })).toBeNull();
  });

  it("Gym A cannot read Gym B payments", async () => {
    expect(await tenantDb(A.tenant.id).payment.findMany()).toHaveLength(0);
    expect(await tenantDb(A.tenant.id).payment.count()).toBe(0);
  });

  it("Gym A cannot read Gym B reports/aggregates", async () => {
    const db = tenantDb(A.tenant.id);
    expect((await db.expense.aggregate({ _sum: { amount: true } }))._sum.amount).toBeNull();
    expect((await db.payment.aggregate({ _sum: { finalAmount: true } }))._sum.finalAmount).toBeNull();
  });

  it("a caller-supplied tenantId in where cannot widen scope", async () => {
    // The hostile filter is overwritten with the session tenant: the caller sees only their own rows.
    const rows = await tenantDb(A.tenant.id).member.findMany({ where: { tenantId: B.tenant.id } });
    expect(rows.every((r) => r.tenantId === A.tenant.id)).toBe(true);
    expect(rows.map((r) => r.id)).not.toContain(memberB.id);
  });

  it("Gym A cannot update or delete Gym B records", async () => {
    const db = tenantDb(A.tenant.id);
    await expect(db.member.update({ where: { id: memberB.id }, data: { firstName: "Hacked" } })).rejects.toThrow();
    await expect(db.member.delete({ where: { id: memberB.id } })).rejects.toThrow();
    expect((await db.member.updateMany({ where: { id: memberB.id }, data: { firstName: "Hacked" } })).count).toBe(0);
    expect((await db.member.deleteMany({ where: { id: memberB.id } })).count).toBe(0);
    const still = await prisma.member.findUniqueOrThrow({ where: { id: memberB.id } });
    expect(still.firstName).toBe("Bob");
  });

  it("creates are stamped with the session tenant, ignoring client tenantId", async () => {
    const created = await tenantDb(A.tenant.id).member.create({
      // deliberately passing a hostile tenantId — must be overwritten
      data: { firstName: "Eve", phone: "1", memberCode: "EVE-1", tenantId: B.tenant.id },
    });
    expect(created.tenantId).toBe(A.tenant.id);
  });

  it("createMany and upsert are also stamped", async () => {
    const db = tenantDb(A.tenant.id);
    await db.expense.createMany({ data: [{ tenantId: B.tenant.id, category: "OTHER", amount: 1, date: new Date() }] });
    const rows = await prisma.expense.findMany({ where: { tenantId: A.tenant.id } });
    expect(rows).toHaveLength(1);
    const s = await db.setting.upsert({
      where: { tenantId_key: { tenantId: A.tenant.id, key: "x" } },
      update: { value: 1 }, create: { tenantId: B.tenant.id, key: "x", value: 1 },
    });
    expect(s.tenantId).toBe(A.tenant.id);
  });

  it("refuses to build a client without a tenant", () => {
    expect(() => tenantDb("")).toThrow();
  });
});

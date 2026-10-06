import { z } from "zod";
import type { Prisma } from "@prisma/client";
import type { TenantDb } from "@/server/db/tenant";
import { DomainError } from "@/server/errors";
import { assignMembership } from "./memberships";
import { phoneSchema, emailSchema } from "@/lib/validation";
import { fullName } from "@/lib/format";

const blank = (v: unknown) => (v === "" || v == null ? undefined : v);
const opt = <T extends z.ZodTypeAny>(s: T) => z.preprocess(blank, s.optional());

export const memberInput = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: opt(z.string().trim().max(60)),
  phone: phoneSchema,
  email: opt(emailSchema),
  gender: opt(z.enum(["MALE", "FEMALE", "OTHER"])),
  dob: opt(z.coerce.date()),
  address: opt(z.string().trim().max(300)),
  emergencyContact: opt(z.string().trim().max(100)),
  bloodGroup: opt(z.string().trim().max(5)),
  branchId: opt(z.string()),
  trainerId: opt(z.string()),
  heightCm: opt(z.coerce.number().min(30).max(260)),
  weightKg: opt(z.coerce.number().min(10).max(500)),
  medicalNotes: opt(z.string().trim().max(1000)),
  fitnessGoals: opt(z.string().trim().max(500)),
  notes: opt(z.string().trim().max(1000)),
  status: opt(z.enum(["ACTIVE", "EXPIRED", "SUSPENDED", "INACTIVE"])),
});
export type MemberInput = z.infer<typeof memberInput>;

async function nextMemberCode(db: TenantDb) {
  const last = await db.member.findFirst({ orderBy: { memberCode: "desc" }, where: { memberCode: { startsWith: "GT-M-" } }, select: { memberCode: true } });
  const n = last ? Number(last.memberCode.replace("GT-M-", "")) + 1 : 1;
  return `GT-M-${String(n).padStart(4, "0")}`;
}

export async function createMember(db: TenantDb, tenantId: string, raw: unknown, opts: { planId?: string } = {}) {
  const i = memberInput.parse(raw);
  const dup = await db.member.findFirst({ where: { phone: i.phone, deletedAt: null }, select: { id: true } });
  if (dup) throw new DomainError("A member with this phone number already exists.");

  for (let attempt = 0; attempt < 4; attempt++) {
    const memberCode = await nextMemberCode(db);
    try {
      return await db.$transaction(async (tx) => {
        const m = await tx.member.create({ data: { ...i, tenantId, memberCode, status: i.status ?? "ACTIVE" } });
        if (opts.planId) await assignMembership(tx, tenantId, m.id, opts.planId);
        return m;
      });
    } catch (e: unknown) {
      if ((e as { code?: string }).code === "P2002") continue; // memberCode race
      throw e;
    }
  }
  throw new DomainError("Could not allocate a member ID. Please retry.");
}

export async function updateMember(db: TenantDb, id: string, raw: unknown) {
  const i = memberInput.parse(raw);
  const dup = await db.member.findFirst({ where: { phone: i.phone, deletedAt: null, NOT: { id } }, select: { id: true } });
  if (dup) throw new DomainError("Another member already uses this phone number.");
  return db.member.update({ where: { id }, data: { ...i, status: i.status ?? undefined } });
}

/** Soft-delete: history (payments, attendance) is kept. */
export const deactivateMember = (db: TenantDb, id: string) =>
  db.member.update({ where: { id }, data: { deletedAt: new Date(), status: "INACTIVE" } });

export type MemberQuery = { q?: string; status?: string; planId?: string; trainerId?: string; page?: number; sort?: string; pageSize?: number };

export async function listMembers(db: TenantDb, qy: MemberQuery) {
  const pageSize = qy.pageSize ?? 20;
  const page = Math.max(1, qy.page ?? 1);
  const where: Prisma.MemberWhereInput = { deletedAt: null };
  if (qy.q) {
    where.OR = [
      { firstName: { contains: qy.q, mode: "insensitive" } }, { lastName: { contains: qy.q, mode: "insensitive" } },
      { phone: { contains: qy.q } }, { email: { contains: qy.q, mode: "insensitive" } }, { memberCode: { contains: qy.q, mode: "insensitive" } },
    ];
  }
  if (qy.status && ["ACTIVE", "EXPIRED", "SUSPENDED", "INACTIVE"].includes(qy.status)) where.status = qy.status as never;
  if (qy.trainerId) where.trainerId = qy.trainerId;
  if (qy.planId) where.memberships = { some: { planId: qy.planId, status: "ACTIVE" } };
  const orderBy: Prisma.MemberOrderByWithRelationInput =
    qy.sort === "name" ? { firstName: "asc" } : qy.sort === "oldest" ? { joinDate: "asc" } : { joinDate: "desc" };

  const [rows, total] = await Promise.all([
    db.member.findMany({ where, orderBy, skip: (page - 1) * pageSize, take: pageSize,
      include: { trainer: { select: { name: true } }, memberships: { orderBy: { endDate: "desc" }, take: 1, include: { plan: { select: { name: true } } } } } }),
    db.member.count({ where }),
  ]);
  return { rows, total, page, pageSize };
}

// ── CSV import ──
export const IMPORT_FIELDS = ["name", "phone", "email", "gender", "dob", "join date", "membership", "start date", "end date", "amount"] as const;

export type ImportPreview = {
  valid: { row: number; data: Record<string, string> }[];
  invalid: { row: number; error: string }[];
  duplicate: { row: number; phone: string }[];
};

export async function previewImport(db: TenantDb, rows: string[][]): Promise<ImportPreview> {
  const [head, ...body] = rows;
  const out: ImportPreview = { valid: [], invalid: [], duplicate: [] };
  if (!head) return out;
  const idx = Object.fromEntries(head.map((h, i) => [h.trim().toLowerCase(), i]));
  if (idx["name"] == null || idx["phone"] == null) throw new DomainError("CSV must have at least 'name' and 'phone' columns.");
  const existing = new Set((await db.member.findMany({ where: { deletedAt: null }, select: { phone: true } })).map((m) => m.phone));
  const seen = new Set<string>();
  body.forEach((r, n) => {
    const get = (k: string) => (idx[k] == null ? "" : (r[idx[k]!] ?? "").trim());
    const row = n + 2;
    const phone = get("phone");
    if (!get("name")) return out.invalid.push({ row, error: "Missing name" });
    if (!phoneSchema.safeParse(phone).success) return out.invalid.push({ row, error: "Invalid phone" });
    if (get("email") && !emailSchema.safeParse(get("email")).success) return out.invalid.push({ row, error: "Invalid email" });
    if (get("dob") && Number.isNaN(Date.parse(get("dob")))) return out.invalid.push({ row, error: "Invalid DOB (use YYYY-MM-DD)" });
    if (existing.has(phone) || seen.has(phone)) return out.duplicate.push({ row, phone });
    seen.add(phone);
    out.valid.push({ row, data: Object.fromEntries(IMPORT_FIELDS.map((k) => [k, get(k)])) });
  });
  return out;
}

export async function commitImport(db: TenantDb, tenantId: string, preview: ImportPreview) {
  let created = 0;
  for (const { data } of preview.valid) {
    const [first, ...rest] = data.name!.split(/\s+/);
    await createMember(db, tenantId, {
      firstName: first, lastName: rest.join(" "), phone: data.phone, email: data.email, dob: data.dob,
      gender: data.gender?.toUpperCase() === "MALE" || data.gender?.toUpperCase() === "FEMALE" ? data.gender.toUpperCase() : undefined,
    });
    created++;
  }
  return created;
}

export { fullName };

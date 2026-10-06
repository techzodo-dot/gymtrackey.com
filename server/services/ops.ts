import { randomBytes } from "node:crypto";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import type { TenantDb } from "@/server/db/tenant";
import { DomainError } from "@/server/errors";
import { hashPassword } from "@/server/auth/password";
import { emailSchema, phoneSchema } from "@/lib/validation";
import { rupeesToMinor } from "@/lib/format";
import { prisma } from "@/server/db/prisma";
import { assertWithinLimit } from "./limits";

const blank = (v: unknown) => (v === "" || v == null ? undefined : v);
const opt = <T extends z.ZodTypeAny>(s: T) => z.preprocess(blank, s.optional());
const num = opt(z.coerce.number());

// ───────── Trainers ─────────
export const trainerInput = z.object({
  name: z.string().trim().min(2).max(80), phone: opt(phoneSchema), email: opt(emailSchema),
  specialization: opt(z.string().trim().max(80)), joinedAt: opt(z.coerce.date()),
  salary: opt(z.coerce.number().min(0)), commissionPct: opt(z.coerce.number().min(0).max(100)),
});
export async function createTrainer(db: TenantDb, tenantId: string, raw: unknown) {
  const i = trainerInput.parse(raw);
  return db.trainer.create({ data: { tenantId, ...i, salary: i.salary != null ? rupeesToMinor(i.salary) : undefined } });
}

// ───────── Workout & diet plans ─────────
const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"] as const;
const MEALS = ["BREAKFAST", "MID_MORNING", "LUNCH", "EVENING", "DINNER", "BEFORE_BED"] as const;

export const workoutInput = z.object({
  memberId: z.string().min(1), trainerId: opt(z.string()), name: z.string().trim().min(2).max(100),
  startDate: z.coerce.date(), endDate: opt(z.coerce.date()),
});
const exerciseRow = z.object({
  day: z.enum(DAYS), exercise: z.string().trim().min(1).max(100), sets: num, reps: num, weightKg: num, restSec: num, notes: opt(z.string().max(300)),
});

/** Reads parallel arrays (ex_day[], ex_exercise[], …) posted by the RowsBuilder. */
export function readRows(fd: FormData, prefix: string, keys: string[]) {
  const cols = keys.map((k) => fd.getAll(`${prefix}_${k}`).map(String));
  const n = Math.max(0, ...cols.map((c) => c.length));
  const rows: Record<string, string>[] = [];
  for (let r = 0; r < n; r++) {
    const row = Object.fromEntries(keys.map((k, c) => [k, (cols[c]![r] ?? "").trim()]));
    if (row[keys[1]!]) rows.push(row); // second column is the required "what" (exercise / food)
  }
  return rows;
}

export async function createWorkoutPlan(db: TenantDb, tenantId: string, raw: unknown, rows: unknown[]) {
  const i = workoutInput.parse(raw);
  const ex = rows.map((r) => exerciseRow.parse(r));
  if (ex.length === 0) throw new DomainError("Add at least one exercise.");
  const member = await db.member.findFirst({ where: { id: i.memberId, deletedAt: null }, select: { id: true } });
  if (!member) throw new DomainError("Member not found.");
  return db.workoutPlan.create({
    data: { tenantId, ...i, exercises: { create: ex.map((e, n) => ({ tenantId, ...e, sortOrder: n })) } },
  });
}

export const dietInput = z.object({ memberId: z.string().min(1), trainerId: opt(z.string()), name: z.string().trim().min(2).max(100), notes: opt(z.string().max(500)) });
const mealRow = z.object({ mealTime: z.enum(MEALS), food: z.string().trim().min(1).max(120), quantity: opt(z.string().max(60)), calories: num, proteinG: num, carbsG: num, fatsG: num, notes: opt(z.string().max(200)) });

export async function createDietPlan(db: TenantDb, tenantId: string, raw: unknown, rows: unknown[]) {
  const i = dietInput.parse(raw);
  const meals = rows.map((r) => mealRow.parse(r));
  if (meals.length === 0) throw new DomainError("Add at least one meal.");
  const member = await db.member.findFirst({ where: { id: i.memberId, deletedAt: null }, select: { id: true } });
  if (!member) throw new DomainError("Member not found.");
  return db.dietPlan.create({ data: { tenantId, ...i, meals: { create: meals.map((m) => ({ tenantId, ...m })) } } });
}

export async function toggleExercise(db: TenantDb, id: string) {
  const e = await db.workoutExercise.findFirst({ where: { id } });
  if (!e) throw new DomainError("Exercise not found.");
  return db.workoutExercise.update({ where: { id }, data: { completed: !e.completed } });
}

// ───────── Measurements ─────────
export const measurementInput = z.object({
  memberId: z.string().min(1), measuredAt: opt(z.coerce.date()),
  weightKg: num, heightCm: num, chestCm: num, waistCm: num, hipCm: num, bicepsCm: num, thighCm: num, bodyFatPct: num, muscleMassKg: num,
});
export const calcBmi = (kg?: number, cm?: number) => (kg && cm ? Math.round((kg / (cm / 100) ** 2) * 10) / 10 : undefined);

export async function addMeasurement(db: TenantDb, tenantId: string, raw: unknown, trainerId?: string) {
  const i = measurementInput.parse(raw);
  const member = await db.member.findFirst({ where: { id: i.memberId, deletedAt: null } });
  if (!member) throw new DomainError("Member not found.");
  const height = i.heightCm ?? (member.heightCm ? Number(member.heightCm) : undefined);
  const m = await db.measurement.create({ data: { tenantId, ...i, trainerId, heightCm: height, bmi: calcBmi(i.weightKg, height) } });
  if (i.weightKg) await db.member.update({ where: { id: member.id }, data: { weightKg: i.weightKg } });
  return m;
}

// ───────── Expenses ─────────
export const CATEGORIES = ["RENT", "ELECTRICITY", "WATER", "EQUIPMENT", "MAINTENANCE", "SALARY", "MARKETING", "CLEANING", "INTERNET", "OTHER"] as const;
export const expenseInput = z.object({
  category: z.enum(CATEGORIES), amount: z.coerce.number().positive().max(100_000_000), date: z.coerce.date(),
  method: z.enum(["CASH", "UPI", "CARD", "BANK_TRANSFER", "CHEQUE", "ONLINE"]).default("CASH"),
  vendor: opt(z.string().trim().max(100)), description: opt(z.string().trim().max(300)),
});
export async function createExpense(db: TenantDb, tenantId: string, userId: string, raw: unknown) {
  const i = expenseInput.parse(raw);
  return db.expense.create({ data: { tenantId, ...i, amount: rupeesToMinor(i.amount), addedById: userId } });
}

// ───────── Staff ─────────
export const staffInput = z.object({
  name: z.string().trim().min(2).max(80), email: emailSchema, phone: opt(phoneSchema),
  role: z.enum(["MANAGER", "TRAINER", "RECEPTIONIST"]), permissions: z.array(z.string()).default([]),
});
export async function createStaff(ctx: { db: TenantDb; tenant: { id: string; planCode: string; status: Prisma.TenantCreateInput["status"] } }, raw: unknown) {
  const i = staffInput.parse(raw);
  await assertWithinLimit(ctx.tenant as never, ctx.db, "staff");
  if (await prisma.user.findUnique({ where: { email: i.email }, select: { id: true } })) throw new DomainError("A user with this email already exists.");
  const tempPassword = `${randomBytes(6).toString("base64url")}9aA`;
  const user = await prisma.user.create({
    data: { tenantId: ctx.tenant.id, email: i.email, name: i.name, phone: i.phone, role: i.role, permissions: i.permissions,
      passwordHash: await hashPassword(tempPassword) },
  });
  await prisma.staff.create({ data: { tenantId: ctx.tenant.id, userId: user.id, role: i.role, permissions: i.permissions } });
  if (i.role === "TRAINER") await prisma.trainer.create({ data: { tenantId: ctx.tenant.id, userId: user.id, name: i.name, phone: i.phone, email: i.email } });
  return { user, tempPassword };
}

// ───────── Branches ─────────
export const branchInput = z.object({ name: z.string().trim().min(2).max(80), city: opt(z.string().max(80)), address: opt(z.string().max(200)), phone: opt(phoneSchema) });
export async function createBranch(db: TenantDb, tenant: { id: string; planCode: string; status: never }, raw: unknown) {
  const i = branchInput.parse(raw);
  await assertWithinLimit(tenant, db, "branches");
  return db.branch.create({ data: { tenantId: tenant.id, ...i } });
}

// ───────── Announcements ─────────
export const announcementInput = z.object({
  title: z.string().trim().min(2).max(120), body: z.string().trim().min(2).max(1000),
  audience: z.enum(["ALL_MEMBERS", "MEMBERSHIP_PLAN", "TRAINER_MEMBERS"]).default("ALL_MEMBERS"), targetId: opt(z.string()),
});
export async function sendAnnouncement(db: TenantDb, tenantId: string, userId: string, raw: unknown) {
  const i = announcementInput.parse(raw);
  const where: Prisma.MemberWhereInput = { deletedAt: null };
  if (i.audience === "MEMBERSHIP_PLAN") { if (!i.targetId) throw new DomainError("Choose a membership plan."); where.memberships = { some: { planId: i.targetId, status: "ACTIVE" } }; }
  if (i.audience === "TRAINER_MEMBERS") { if (!i.targetId) throw new DomainError("Choose a trainer."); where.trainerId = i.targetId; }
  const members = await db.member.findMany({ where, select: { id: true } });
  const a = await db.announcement.create({ data: { tenantId, ...i, createdById: userId } });
  if (members.length) await db.notification.createMany({ data: members.map((m) => ({ tenantId, memberId: m.id, type: "ANNOUNCEMENT" as const, title: i.title, body: i.body })) });
  return { announcement: a, recipients: members.length };
}

// ───────── Support ─────────
export const ticketInput = z.object({ subject: z.string().trim().min(3).max(150), body: z.string().trim().min(3).max(3000) });
export async function createTicket(db: TenantDb, tenantId: string, userId: string, raw: unknown) {
  const i = ticketInput.parse(raw);
  return db.supportTicket.create({ data: { tenantId, subject: i.subject, messages: { create: { authorId: userId, body: i.body } } } });
}
export async function replyTicket(db: TenantDb, ticketId: string, userId: string, body: string) {
  const t = await db.supportTicket.findFirst({ where: { id: ticketId } });
  if (!t) throw new DomainError("Ticket not found.");
  if (!body.trim()) throw new DomainError("Write a reply first.");
  await prisma.supportMessage.create({ data: { ticketId, authorId: userId, body: body.trim().slice(0, 3000) } });
  return db.supportTicket.update({ where: { id: ticketId }, data: { status: t.status === "RESOLVED" || t.status === "CLOSED" ? "OPEN" : t.status } });
}

// ───────── Settings ─────────
export const gymSettingsInput = z.object({
  name: z.string().trim().min(2).max(100), phone: opt(phoneSchema), email: opt(emailSchema), address: opt(z.string().max(300)),
  city: opt(z.string().max(80)), state: opt(z.string().max(80)), gstin: opt(z.string().trim().toUpperCase().regex(/^[0-9A-Z]{15}$/, "GSTIN must be 15 characters")),
  website: opt(z.string().url()), invoicePrefix: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{2,6}$/, "Prefix: 2–6 letters/numbers").default("GT"),
  primaryColor: opt(z.string().regex(/^#[0-9a-fA-F]{6}$/)),
});
export async function updateGym(db: TenantDb, raw: unknown) {
  const i = gymSettingsInput.parse(raw);
  const gym = await db.gym.findFirstOrThrow();
  await db.gym.update({ where: { id: gym.id }, data: i });
  await prisma.tenant.update({ where: { id: gym.tenantId }, data: { name: i.name } });
}
export async function saveSetting(db: TenantDb, tenantId: string, key: string, value: Prisma.InputJsonValue) {
  return db.setting.upsert({ where: { tenantId_key: { tenantId, key } }, update: { value }, create: { tenantId, key, value } });
}
export async function getSetting<T>(db: TenantDb, key: string, fallback: T): Promise<T> {
  const s = await db.setting.findFirst({ where: { key } });
  return { ...fallback, ...((s?.value ?? {}) as object) } as T;
}

// ───────── Member portal access ─────────
export async function createMemberLogin(db: TenantDb, tenantId: string, memberId: string) {
  const m = await db.member.findFirst({ where: { id: memberId, deletedAt: null } });
  if (!m) throw new DomainError("Member not found.");
  if (m.userId) throw new DomainError("This member already has portal access.");
  if (!m.email) throw new DomainError("Add an email address to the member first.");
  if (await prisma.user.findUnique({ where: { email: m.email.toLowerCase() }, select: { id: true } })) throw new DomainError("That email is already used by another account.");
  const tempPassword = `${randomBytes(6).toString("base64url")}9aA`;
  const user = await prisma.user.create({ data: { tenantId, email: m.email.toLowerCase(), name: `${m.firstName} ${m.lastName ?? ""}`.trim(), role: "MEMBER", passwordHash: await hashPassword(tempPassword) } });
  await db.member.update({ where: { id: m.id }, data: { userId: user.id } });
  return { email: user.email, tempPassword };
}

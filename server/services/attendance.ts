import type { AttendanceMethod } from "@prisma/client";
import type { TenantDb } from "@/server/db/tenant";
import { DomainError } from "@/server/errors";
import { fullName, startOfDay } from "@/lib/format";

/**
 * Check a member in by member code, QR token or phone. Validates that the member exists
 * and has an unexpired, unfrozen membership.
 */
export async function checkIn(db: TenantDb, tenantId: string, identifier: string, method: AttendanceMethod = "MANUAL") {
  const id = identifier.trim();
  if (!id) throw new DomainError("Enter a member ID, phone number or scan a QR code.");

  const member = await db.member.findFirst({
    where: { deletedAt: null, OR: [{ memberCode: { equals: id, mode: "insensitive" } }, { qrToken: id }, { phone: id }, { id }] },
    include: { memberships: { where: { status: { in: ["ACTIVE", "FROZEN"] } }, orderBy: { endDate: "desc" }, take: 1 } },
  });
  if (!member) throw new DomainError("Member not found.");
  if (member.status === "SUSPENDED") throw new DomainError("Membership suspended. Please contact reception.");

  const ms = member.memberships[0];
  const today = startOfDay();
  if (!ms || ms.endDate < today) throw new DomainError("Membership expired. Please contact reception.");
  if (ms.status === "FROZEN") throw new DomainError("Membership is frozen. Please contact reception.");

  const recent = await db.attendance.findFirst({ where: { memberId: member.id, checkInAt: { gte: new Date(Date.now() - 5 * 60_000) } } });
  if (recent) return { member, attendance: recent, duplicate: true };

  const attendance = await db.attendance.create({ data: { tenantId, memberId: member.id, branchId: member.branchId, method } });
  return { member, attendance, duplicate: false };
}

export const memberLabel = fullName;

/** Members with an active membership who haven't visited for `days`. */
export async function inactiveMembers(db: TenantDb, days = 14) {
  const since = new Date(Date.now() - days * 86_400_000);
  const members = await db.member.findMany({
    where: { deletedAt: null, status: "ACTIVE", joinDate: { lt: since }, attendance: { none: { checkInAt: { gte: since } } } },
    include: { trainer: { select: { name: true } }, attendance: { orderBy: { checkInAt: "desc" }, take: 1 } },
    take: 50,
  });
  return members;
}

export async function peakHours(db: TenantDb, days = 30) {
  const rows = await db.attendance.findMany({ where: { checkInAt: { gte: new Date(Date.now() - days * 86_400_000) } }, select: { checkInAt: true } });
  const hours = Array<number>(24).fill(0);
  for (const r of rows) hours[Number(r.checkInAt.toLocaleString("en-GB", { hour: "2-digit", hour12: false, timeZone: "Asia/Kolkata" })) % 24]!++;
  return hours;
}

/** Birthdays today and within the next `days`. */
export async function upcomingBirthdays(db: TenantDb, days = 14) {
  const members = await db.member.findMany({ where: { deletedAt: null, dob: { not: null } }, select: { id: true, firstName: true, lastName: true, phone: true, dob: true } });
  const today = startOfDay();
  return members
    .map((m) => {
      const d = m.dob!;
      let next = new Date(today.getFullYear(), d.getUTCMonth(), d.getUTCDate());
      if (next < today) next = new Date(today.getFullYear() + 1, d.getUTCMonth(), d.getUTCDate());
      return { ...m, next, inDays: Math.round((next.getTime() - today.getTime()) / 86_400_000) };
    })
    .filter((m) => m.inDays <= days)
    .sort((a, b) => a.inDays - b.inDays);
}

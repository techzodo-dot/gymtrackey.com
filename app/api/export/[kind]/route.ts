import { fail } from "@/server/api";
import { AuthError, requirePermission } from "@/server/auth/guard";
import type { Permission } from "@/server/auth/permissions";
import { listMembers } from "@/server/services/members";
import { monthlyRevenue, taxReport } from "@/server/services/reports";
import { toCsv, fmtDate, fullName, minorToRupees, isoDate } from "@/lib/format";

const PERM: Record<string, Permission> = { members: "members", payments: "payments", expenses: "expenses", revenue: "reports", tax: "reports", attendance: "attendance", dues: "reports" };

/** CSV export of the caller's own gym data only (tenant-locked client). */
export async function GET(req: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!PERM[kind]) return fail("Unknown export.", 404);
  try {
    const { db } = await requirePermission(PERM[kind]!);
    const q = Object.fromEntries(new URL(req.url).searchParams);
    let rows: unknown[][] = [];

    if (kind === "members") {
      const { rows: ms } = await listMembers(db, { q: q.q, status: q.status, planId: q.plan, trainerId: q.trainer, pageSize: 5000 });
      rows = [["Member ID", "Name", "Phone", "Email", "Gender", "DOB", "Joined", "Plan", "Valid till", "Trainer", "Status"],
        ...ms.map((m) => [m.memberCode, fullName(m), m.phone, m.email, m.gender, isoDate(m.dob), isoDate(m.joinDate), m.memberships[0]?.plan.name, isoDate(m.memberships[0]?.endDate), m.trainer?.name, m.status])];
    } else if (kind === "payments") {
      const ps = await db.payment.findMany({ orderBy: { createdAt: "desc" }, take: 10000, include: { member: true, invoice: true } });
      rows = [["Invoice", "Date", "Member", "Amount", "Discount", "Tax", "Total", "Method", "Status"],
        ...ps.map((p) => [p.invoice?.number, isoDate(p.paidAt ?? p.dueDate), fullName(p.member), minorToRupees(p.amount), minorToRupees(p.discount), minorToRupees(p.tax), minorToRupees(p.finalAmount), p.method, p.status])];
    } else if (kind === "expenses") {
      const es = await db.expense.findMany({ orderBy: { date: "desc" }, take: 10000 });
      rows = [["Date", "Category", "Amount", "Method", "Vendor", "Description"], ...es.map((e) => [isoDate(e.date), e.category, minorToRupees(e.amount), e.method, e.vendor, e.description])];
    } else if (kind === "revenue") {
      rows = [["Month", "Revenue"], ...(await monthlyRevenue(db, 12)).map((r) => [r.label, minorToRupees(r.value)])];
    } else if (kind === "tax") {
      const inv = await taxReport(db, new Date(q.from ?? "2000-01-01"), new Date(q.to ?? "2100-01-01"));
      rows = [["Invoice", "Date", "Member", "Subtotal", "Discount", "CGST", "SGST", "IGST", "Total"],
        ...inv.map((i) => [i.number, isoDate(i.issuedAt), fullName(i.member), minorToRupees(i.subtotal), minorToRupees(i.discount), minorToRupees(i.cgst), minorToRupees(i.sgst), minorToRupees(i.igst), minorToRupees(i.total)])];
    } else if (kind === "attendance") {
      const as = await db.attendance.findMany({ orderBy: { checkInAt: "desc" }, take: 10000, include: { member: true } });
      rows = [["Date", "Member ID", "Member", "Method"], ...as.map((a) => [fmtDate(a.checkInAt), a.member.memberCode, fullName(a.member), a.method])];
    }
    return new Response(toCsv(rows), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="gymtrackey-${kind}-${isoDate(new Date())}.csv"`, "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof AuthError) return fail(e.message, e.status);
    throw e;
  }
}

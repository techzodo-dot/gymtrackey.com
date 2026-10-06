import Link from "next/link";
import { pageAuth } from "@/server/auth/page";
import { inactiveMembers, peakHours, upcomingBirthdays } from "@/server/services/attendance";
import { getSetting } from "@/server/services/ops";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart } from "@/components/charts";
import { EmptyState, Flash, PageHeader, Stat, TableWrap, Td, Th } from "@/components/ui/page";
import { fmtDate, fmtDateTime, fullName, startOfDay } from "@/lib/format";
import { sendReminderAction } from "../members/actions";
import { checkInAction } from "./actions";

export const metadata = { title: "Attendance" };

export default async function Attendance({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const { db } = await pageAuth("attendance", "attendance");
  const today = startOfDay();
  const { inactiveDays } = await getSetting(db, "attendance", { inactiveDays: 14 });
  const [todayRows, inGym, activeMembers, hours, inactive, birthdays] = await Promise.all([
    db.attendance.findMany({ where: { checkInAt: { gte: today } }, orderBy: { checkInAt: "desc" }, include: { member: true }, take: 100 }),
    db.attendance.count({ where: { checkInAt: { gte: new Date(Date.now() - 2 * 3600_000) } } }),
    db.member.count({ where: { deletedAt: null, status: "ACTIVE" } }),
    peakHours(db), inactiveMembers(db, inactiveDays), upcomingBirthdays(db, 14),
  ]);
  const uniqueToday = new Set(todayRows.map((r) => r.memberId)).size;
  const hourData = hours.map((v, h) => ({ label: `${h}`, value: v })).slice(5, 23);

  return (
    <>
      <PageHeader title="Attendance" subtitle="Check members in by ID, phone or QR scan." />
      <Flash ok={sp.ok} error={sp.error} />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Today's check-ins" value={todayRows.length} /><Stat label="Currently in gym" value={inGym} sub="last 2 hours" tone="good" />
        <Stat label="Attendance today" value={`${activeMembers ? Math.round((uniqueToday / activeMembers) * 100) : 0}%`} sub={`${uniqueToday} of ${activeMembers} active`} /><Stat label="Inactive members" value={inactive.length} tone={inactive.length ? "warn" : undefined} sub={`${inactiveDays}+ days away`} />
      </div>
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-bold">Check in</h2>
          <form action={checkInAction} className="flex gap-2">
            <input name="identifier" autoFocus required placeholder="Member ID, phone, or scan QR" aria-label="Member ID, phone or QR code" className="flex-1 rounded-xl border border-line bg-surface2 px-3.5 py-2.5 text-sm outline-none focus:border-brand2" />
            <Button type="submit">Check in</Button>
          </form>
          <p className="mt-2 text-xs text-muted">A USB/Bluetooth QR scanner types the code here automatically. Expired or frozen memberships are blocked.</p>
        </Card>
        <Card><BarChart title="Peak hours (last 30 days, 5am–10pm)" data={hourData} height={110} /></Card>
      </div>

      <h2 className="mb-3 text-lg font-bold">Today</h2>
      {todayRows.length === 0 ? <EmptyState title="No check-ins yet today." /> : (
        <TableWrap><thead><tr><Th>Time</Th><Th>Member</Th><Th>Method</Th></tr></thead><tbody>
          {todayRows.map((a) => <tr key={a.id}><Td>{fmtDateTime(a.checkInAt)}</Td><Td><Link className="hover:text-brand" href={`/dashboard/members/${a.memberId}`}>{fullName(a.member)}</Link> <span className="text-xs text-muted">{a.member.memberCode}</span></Td><Td>{a.method}</Td></tr>)}</tbody></TableWrap>
      )}

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Card className="p-0"><h2 className="border-b border-line px-5 py-3 font-bold">Inactive members <span className="text-sm font-normal text-muted">(no visit for {inactiveDays}+ days)</span></h2>
          {inactive.length === 0 ? <p className="p-5 text-sm text-muted">Everyone is showing up. 🎉</p> : <ul className="divide-y divide-line">{inactive.slice(0, 8).map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm"><div><Link className="font-semibold hover:text-brand" href={`/dashboard/members/${m.id}`}>{fullName(m)}</Link><p className="text-xs text-muted">Last visit: {m.attendance[0] ? fmtDate(m.attendance[0].checkInAt) : "never"} · {m.phone} · {m.trainer?.name ?? "No trainer"}</p></div>
              <form action={sendReminderAction}><input type="hidden" name="id" value={m.id} /><input type="hidden" name="back" value="/dashboard/attendance" /><Button variant="secondary" className="px-3 py-1.5" type="submit">Send reminder</Button></form></li>))}</ul>}
        </Card>
        <Card className="p-0"><h2 className="border-b border-line px-5 py-3 font-bold">Birthdays</h2>
          {birthdays.length === 0 ? <p className="p-5 text-sm text-muted">No upcoming birthdays in the next 2 weeks.</p> : <ul className="divide-y divide-line">{birthdays.slice(0, 8).map((m) => (
            <li key={m.id} className="flex items-center justify-between px-5 py-3 text-sm"><span>🎂 <b>{fullName(m)}</b> <span className="text-xs text-muted">{m.inDays === 0 ? "Today!" : `in ${m.inDays} day${m.inDays > 1 ? "s" : ""}`}</span></span>
              <a className="text-brand underline" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${m.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Happy Birthday ${m.firstName}! 🎉 Wishing you a strong year ahead.`)}`}>Send WhatsApp wish</a></li>))}</ul>}
        </Card>
      </div>
    </>
  );
}

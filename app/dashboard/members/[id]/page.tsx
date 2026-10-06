import Link from "next/link";
import { notFound } from "next/navigation";
import { pageAuth } from "@/server/auth/page";
import { can } from "@/server/auth/permissions";
import { Card } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { ConfirmForm } from "@/components/ui/confirm";
import { EmptyState, Flash, StatusBadge, Tabs, TableWrap, Td, Th } from "@/components/ui/page";
import { FormGrid, Input, Select, Textarea } from "@/components/ui/form";
import { LineChart } from "@/components/charts";
import { fmtDate, fmtDateTime, fullName, isoDate } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { METHODS } from "@/server/services/payments";
import { assignTrainerAction, addMeasurementAction, deactivateMemberAction, freezeAction, markAttendanceAction, renewAction, saveNotesAction, sendReminderAction, unfreezeAction } from "../actions";
import { PortalAccess } from "@/components/dashboard/portal-access";
import { DietCard, WorkoutCard } from "@/components/dashboard/plan-cards";

const TABS = [["overview", "Overview"], ["membership", "Membership"], ["payments", "Payments"], ["attendance", "Attendance"], ["workout", "Workout"], ["diet", "Diet"], ["measurements", "Measurements"], ["progress", "Progress"], ["notes", "Notes"], ["documents", "Documents"]] as const;
const methodOpts = METHODS.map((m) => [m, m.replace("_", " ")] as const);

export default async function MemberProfile({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; ok?: string; error?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const tab = TABS.some(([k]) => k === sp.tab) ? sp.tab! : "overview";
  const ctx = await pageAuth("members");
  const { db, user } = ctx;
  const m = await db.member.findFirst({ where: { id, deletedAt: null }, include: { trainer: true, memberships: { orderBy: { endDate: "desc" }, include: { plan: true } } } });
  if (!m) notFound();
  const base = `/dashboard/members/${id}`;
  const current = m.memberships.find((x) => ["ACTIVE", "FROZEN"].includes(x.status)) ?? m.memberships[0];
  const allow = (p: Parameters<typeof can>[2]) => can(user.role, user.permissions, p);

  return (
    <div>
      <Card className="mb-6 flex flex-wrap items-center gap-4">
        <div className="gt-gradient-bg grid h-16 w-16 place-items-center rounded-full text-xl font-black text-black">{m.firstName[0]}{m.lastName?.[0]}</div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold">{fullName(m)}</h1><StatusBadge status={m.status} /></div>
          <p className="text-sm text-muted">{m.memberCode} · {m.phone}{m.email ? ` · ${m.email}` : ""}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {allow("payments") && <ButtonLink href={`/dashboard/payments/new?member=${id}`}>Collect Payment</ButtonLink>}
          <ButtonLink href={`${base}/edit`} variant="secondary">Edit</ButtonLink>
          <ButtonLink href={`${base}/qr`} variant="secondary">QR</ButtonLink>
          {allow("attendance") && <form action={markAttendanceAction}><input type="hidden" name="id" value={id} /><Button variant="secondary" type="submit">Mark Attendance</Button></form>}
          {allow("notifications") && <form action={sendReminderAction}><input type="hidden" name="id" value={id} /><Button variant="secondary" type="submit">Send Reminder</Button></form>}
        </div>
      </Card>
      <Flash ok={sp.ok} error={sp.error} />
      <Tabs tabs={TABS} active={tab} base={base} />

      {tab === "overview" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h2 className="mb-3 font-bold">Details</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {([["Gender", m.gender], ["Date of birth", fmtDate(m.dob)], ["Blood group", m.bloodGroup], ["Joined", fmtDate(m.joinDate)], ["Height", m.heightCm ? `${m.heightCm} cm` : null], ["Weight", m.weightKg ? `${m.weightKg} kg` : null],
                ["Emergency contact", m.emergencyContact], ["Fitness goals", m.fitnessGoals], ["Address", m.address]] as const).map(([k, v]) => (
                <div key={k} className="contents"><dt className="text-muted">{k}</dt><dd>{v ?? "—"}</dd></div>))}
            </dl>
          </Card>
          <div className="space-y-4">
            <Card>
              <h2 className="mb-3 font-bold">Current membership</h2>
              {current ? <p className="text-sm">{current.plan.name} · {fmtDate(current.startDate)} → {fmtDate(current.endDate)} <StatusBadge status={current.status} /></p> : <p className="text-sm text-muted">No membership yet.</p>}
            </Card>
            <Card>
              <h2 className="mb-3 font-bold">Trainer</h2>
              <form action={assignTrainerAction} className="flex gap-2">
                <input type="hidden" name="id" value={id} />
                <select name="trainerId" defaultValue={m.trainerId ?? ""} aria-label="Trainer" className="flex-1 rounded-xl border border-line bg-surface2 px-3 py-2 text-sm">
                  <option value="">Unassigned</option>{(await db.trainer.findMany({ where: { isActive: true } })).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <Button variant="secondary" type="submit">Assign Trainer</Button>
              </form>
            </Card>
            {!m.userId && <Card><h2 className="mb-2 font-bold">Member portal</h2><p className="mb-3 text-sm text-muted">Let the member see their membership, payments, workout and diet on their phone.</p><PortalAccess memberId={id} /></Card>}
            <div className="flex gap-2">
              <ButtonLink href={`/dashboard/workouts/new?member=${id}`} variant="secondary">Create Workout</ButtonLink>
              <ButtonLink href={`${base}?tab=measurements`} variant="secondary">Add Measurement</ButtonLink>
              <ConfirmForm action={deactivateMemberAction} title="Deactivate this member?" message="They will be removed from active lists. Payments and attendance history are kept." label="Deactivate" confirmLabel="Deactivate"><input type="hidden" name="id" value={id} /></ConfirmForm>
            </div>
          </div>
        </div>
      )}

      {tab === "membership" && (
        <div className="space-y-5">
          <Card>
            <h2 className="mb-3 font-bold">Renew / start membership</h2>
            {await (async () => {
              const plans = await db.membershipPlan.findMany({ where: { isActive: true } });
              if (!plans.length) return <p className="text-sm text-muted">Create a membership plan first. <Link className="text-brand underline" href="/dashboard/memberships">Add plan</Link></p>;
              return (
                <form action={renewAction} className="space-y-4">
                  <input type="hidden" name="memberId" value={id} />
                  <FormGrid>
                    <Select label="Plan" name="planId" required options={plans.map((p) => [p.id, `${p.name} — ${formatMoney(p.price)}`])} />
                    <Input label="Amount (₹)" name="amount" type="number" step="0.01" required hint="Enter the plan price, or a custom amount." defaultValue={plans[0] ? plans[0].price / 100 : ""} />
                    <Input label="Discount (₹)" name="discount" type="number" step="0.01" defaultValue="0" />
                    <Select label="Payment method" name="method" options={methodOpts} />
                  </FormGrid>
                  <Button type="submit">Take payment & renew</Button>
                </form>
              );
            })()}
          </Card>
          {current?.status === "ACTIVE" && allowFreeze(current.plan.freezeDays) && (
            <Card>
              <h2 className="mb-3 font-bold">Freeze membership</h2>
              <form action={freezeAction} className="space-y-4">
                <input type="hidden" name="memberId" value={id} /><input type="hidden" name="membershipId" value={current.id} />
                <FormGrid><Input label="From" type="date" name="from" required defaultValue={isoDate(new Date())} /><Input label="To" type="date" name="to" required /><Input label="Reason" name="reason" wrap="sm:col-span-2" /></FormGrid>
                <p className="text-xs text-muted">This plan allows up to {current.plan.freezeDays} freeze day(s). The end date is extended automatically.</p>
                <Button variant="secondary" type="submit">Freeze</Button>
              </form>
            </Card>
          )}
          {current?.status === "FROZEN" && (
            <Card className="flex items-center justify-between"><p className="text-sm">Frozen {fmtDate(current.frozenFrom)} → {fmtDate(current.frozenTo)}</p>
              <form action={unfreezeAction}><input type="hidden" name="memberId" value={id} /><input type="hidden" name="membershipId" value={current.id} /><Button variant="secondary" type="submit">Resume now</Button></form></Card>
          )}
          <TableWrap><thead><tr><Th>Plan</Th><Th>Start</Th><Th>End</Th><Th>Price</Th><Th>Status</Th></tr></thead><tbody>
            {m.memberships.map((x) => <tr key={x.id}><Td>{x.plan.name}</Td><Td>{fmtDate(x.startDate)}</Td><Td>{fmtDate(x.endDate)}</Td><Td>{formatMoney(x.price)}</Td><Td><StatusBadge status={x.status} /></Td></tr>)}
          </tbody></TableWrap>
        </div>
      )}

      {tab === "payments" && (await (async () => {
        const pays = await db.payment.findMany({ where: { memberId: id }, orderBy: { createdAt: "desc" }, include: { invoice: true } });
        if (!pays.length) return <EmptyState title="No payments yet." action={<ButtonLink href={`/dashboard/payments/new?member=${id}`}>Collect Payment</ButtonLink>} />;
        return <TableWrap><thead><tr><Th>Date</Th><Th>Invoice</Th><Th>Amount</Th><Th>Method</Th><Th>Status</Th><Th /></tr></thead><tbody>
          {pays.map((p) => <tr key={p.id}><Td>{fmtDate(p.paidAt ?? p.dueDate)}</Td><Td>{p.invoice?.number ?? "—"}</Td><Td>{formatMoney(p.finalAmount)}</Td><Td>{p.method.replace("_", " ")}</Td><Td><StatusBadge status={p.status} /></Td>
            <Td>{p.invoice ? <Link className="text-brand underline" href={`/dashboard/payments/${p.id}`}>Receipt</Link> : <Link className="text-brand underline" href={`/dashboard/payments/new?member=${id}&payment=${p.id}`}>Collect</Link>}</Td></tr>)}
        </tbody></TableWrap>;
      })())}

      {tab === "attendance" && (await (async () => {
        const att = await db.attendance.findMany({ where: { memberId: id }, orderBy: { checkInAt: "desc" }, take: 40 });
        if (!att.length) return <EmptyState title="No check-ins yet." body="Use Mark Attendance above or scan the member's QR at reception." />;
        return <TableWrap><thead><tr><Th>Check-in</Th><Th>Method</Th></tr></thead><tbody>{att.map((a) => <tr key={a.id}><Td>{fmtDateTime(a.checkInAt)}</Td><Td>{a.method}</Td></tr>)}</tbody></TableWrap>;
      })())}

      {tab === "workout" && (await (async () => {
        const plans = await db.workoutPlan.findMany({ where: { memberId: id }, include: { exercises: { orderBy: { sortOrder: "asc" } }, trainer: true }, orderBy: { createdAt: "desc" } });
        if (!plans.length) return <EmptyState title="No workout plan yet." action={<ButtonLink href={`/dashboard/workouts/new?member=${id}`}>Create Workout</ButtonLink>} />;
        return <div className="space-y-4">{plans.map((p) => <WorkoutCard key={p.id} plan={p} back={`${base}?tab=workout`} />)}</div>;
      })())}

      {tab === "diet" && (await (async () => {
        const plans = await db.dietPlan.findMany({ where: { memberId: id }, include: { meals: true }, orderBy: { createdAt: "desc" } });
        if (!plans.length) return <EmptyState title="No diet plan yet." action={<ButtonLink href={`/dashboard/diets/new?member=${id}`}>Create Diet Plan</ButtonLink>} />;
        return <div className="space-y-4">{plans.map((p) => <DietCard key={p.id} plan={p} />)}</div>;
      })())}

      {tab === "measurements" && (await (async () => {
        const ms = await db.measurement.findMany({ where: { memberId: id }, orderBy: { measuredAt: "asc" } });
        const weights = ms.filter((x) => x.weightKg).map((x) => ({ label: fmtDate(x.measuredAt), value: Number(x.weightKg) }));
        return (
          <div className="space-y-5">
            {weights.length > 1 && <Card><LineChart title="Weight (kg)" data={weights} /></Card>}
            {ms.length > 0 && <TableWrap><thead><tr><Th>Date</Th><Th>Weight</Th><Th>BMI</Th><Th>Chest</Th><Th>Waist</Th><Th>Hip</Th><Th>Biceps</Th><Th>Thigh</Th><Th>Body fat</Th></tr></thead><tbody>
              {[...ms].reverse().map((x) => <tr key={x.id}><Td>{fmtDate(x.measuredAt)}</Td><Td>{x.weightKg?.toString() ?? "—"}</Td><Td>{x.bmi?.toString() ?? "—"}</Td><Td>{x.chestCm?.toString() ?? "—"}</Td><Td>{x.waistCm?.toString() ?? "—"}</Td><Td>{x.hipCm?.toString() ?? "—"}</Td><Td>{x.bicepsCm?.toString() ?? "—"}</Td><Td>{x.thighCm?.toString() ?? "—"}</Td><Td>{x.bodyFatPct ? `${x.bodyFatPct}%` : "—"}</Td></tr>)}</tbody></TableWrap>}
            <Card>
              <h2 className="mb-3 font-bold">Add measurement</h2>
              <form action={addMeasurementAction} className="space-y-4"><input type="hidden" name="memberId" value={id} />
                <FormGrid className="sm:grid-cols-3">{(["weightKg:Weight (kg)", "heightCm:Height (cm)", "chestCm:Chest (cm)", "waistCm:Waist (cm)", "hipCm:Hip (cm)", "bicepsCm:Biceps (cm)", "thighCm:Thigh (cm)", "bodyFatPct:Body fat %", "muscleMassKg:Muscle mass (kg)"] as const).map((f) => <Input key={f} label={f.split(":")[1]!} name={f.split(":")[0]!} type="number" step="0.1" />)}</FormGrid>
                <p className="text-xs text-muted">BMI is calculated from weight and height.</p>
                <Button type="submit">Save measurement</Button></form>
            </Card>
          </div>
        );
      })())}

      {tab === "progress" && <EmptyState title="Progress photos need file storage" body="Connect S3-compatible storage (STORAGE_* variables in your environment) to upload front/back/left/right photos and compare them on a timeline." />}
      {tab === "documents" && <EmptyState title="Documents need file storage" body="Connect S3-compatible storage (STORAGE_* variables) to attach ID proofs, waivers and medical documents." />}

      {tab === "notes" && (
        <Card><form action={saveNotesAction} className="space-y-4"><input type="hidden" name="id" value={id} />
          <Textarea label="Notes" name="notes" defaultValue={m.notes ?? ""} /><Textarea label="Medical notes" name="medicalNotes" defaultValue={m.medicalNotes ?? ""} /><Button type="submit">Save notes</Button></form></Card>
      )}
    </div>
  );
}

const allowFreeze = (days: number) => days > 0;

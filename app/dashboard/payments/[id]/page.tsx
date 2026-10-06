import { notFound } from "next/navigation";
import { pageAuth } from "@/server/auth/page";
import { Card } from "@/components/ui/card";
import { ConfirmForm } from "@/components/ui/confirm";
import { Flash, PageHeader, StatusBadge } from "@/components/ui/page";
import { Input, Textarea } from "@/components/ui/form";
import { PrintButton } from "@/components/print-button";
import { fmtDate, fullName } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { refundAction } from "../actions";

export const metadata = { title: "Receipt" };

export default async function Receipt({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { db, user } = await pageAuth("payments");
  const p = await db.payment.findFirst({ where: { id }, include: { member: true, invoice: true, refunds: true, membership: { include: { plan: true } } } });
  if (!p) notFound();
  const [gym, collector] = await Promise.all([db.gym.findFirstOrThrow(), p.collectedById ? db.user.findFirst({ where: { id: p.collectedById } }) : null]);
  const inv = p.invoice;
  const refunded = p.refunds.filter((r) => r.status !== "REJECTED").reduce((s, r) => s + r.amount, 0);
  const msg = `Hi ${p.member.firstName}, thank you! We received ${formatMoney(p.finalAmount)} at ${gym.name} (receipt ${inv?.number ?? ""}) on ${fmtDate(p.paidAt)}.`;
  const wa = `https://wa.me/${p.member.phone.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`;
  const mail = p.member.email ? `mailto:${p.member.email}?subject=${encodeURIComponent(`Receipt ${inv?.number ?? ""} from ${gym.name}`)}&body=${encodeURIComponent(msg)}` : null;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="print:hidden"><PageHeader title="Receipt" actions={<>
        <PrintButton label="Download PDF / Print" />
        <a href={wa} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-line px-5 py-2.5 text-sm font-semibold hover:bg-surface2">Send WhatsApp</a>
        {mail && <a href={mail} className="rounded-xl border border-line px-5 py-2.5 text-sm font-semibold hover:bg-surface2">Send Email</a>}
      </>} /><Flash ok={sp.ok} error={sp.error} /></div>

      <Card className="bg-white p-8 text-black print:border-0 print:shadow-none">
        <div className="flex items-start justify-between border-b border-gray-200 pb-5">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <div className="flex items-center gap-2">{gym.logoUrl ? <img src={gym.logoUrl} alt="" className="h-10 w-10 rounded" /> : <img src="/logo.svg" alt="" className="h-10 w-10" />}<h2 className="text-xl font-extrabold">{gym.name}</h2></div>
            <p className="mt-2 text-xs text-gray-600">{[gym.address, gym.city, gym.state].filter(Boolean).join(", ")}</p>
            {gym.gstin && <p className="text-xs text-gray-600">GSTIN: {gym.gstin}</p>}
          </div>
          <div className="text-right"><p className="text-xs uppercase tracking-wide text-gray-500">Receipt</p><p className="font-bold">{inv?.number ?? "—"}</p><p className="text-xs text-gray-600">{fmtDate(p.paidAt)}</p></div>
        </div>
        <dl className="grid grid-cols-2 gap-y-2 py-5 text-sm">
          <dt className="text-gray-500">Member</dt><dd className="font-semibold">{fullName(p.member)}</dd>
          <dt className="text-gray-500">Member ID</dt><dd>{p.member.memberCode}</dd>
          <dt className="text-gray-500">Membership</dt><dd>{p.membership?.plan.name ?? "—"}{p.membership ? ` (${fmtDate(p.membership.startDate)} – ${fmtDate(p.membership.endDate)})` : ""}</dd>
          <dt className="text-gray-500">Payment method</dt><dd>{p.method.replace("_", " ")}</dd>
          <dt className="text-gray-500">Collected by</dt><dd>{collector?.name ?? "—"}</dd>
        </dl>
        <table className="w-full border-t border-gray-200 text-sm"><tbody>
          <tr><td className="py-2 text-gray-600">Amount</td><td className="py-2 text-right">{formatMoney(p.amount)}</td></tr>
          {p.discount > 0 && <tr><td className="py-1 text-gray-600">Discount</td><td className="py-1 text-right">−{formatMoney(p.discount)}</td></tr>}
          {inv && inv.cgst > 0 && <><tr><td className="py-1 text-gray-600">CGST</td><td className="py-1 text-right">{formatMoney(inv.cgst)}</td></tr><tr><td className="py-1 text-gray-600">SGST</td><td className="py-1 text-right">{formatMoney(inv.sgst)}</td></tr></>}
          {inv && inv.igst > 0 && <tr><td className="py-1 text-gray-600">IGST</td><td className="py-1 text-right">{formatMoney(inv.igst)}</td></tr>}
          <tr className="border-t border-gray-300 font-bold"><td className="py-3 text-base">Total paid</td><td className="py-3 text-right text-base">{formatMoney(p.finalAmount)}</td></tr>
          {refunded > 0 && <tr className="text-red-600"><td className="py-1">Refunded</td><td className="py-1 text-right">−{formatMoney(refunded)}</td></tr>}
        </tbody></table>
        <p className="mt-6 text-center text-xs text-gray-500">Thank you for training with {gym.name}. Powered by GymTrackey.</p>
      </Card>

      {(user.role === "OWNER" || user.role === "MANAGER") && p.status === "PAID" && (
        <Card className="mt-6 print:hidden">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-bold">Refund</h2><StatusBadge status={p.status} /></div>
          <ConfirmForm action={refundAction} title="Issue refund?" message="The refund is recorded against this payment. The original payment is never deleted." label="Issue refund" confirmLabel="Record refund">
            <input type="hidden" name="paymentId" value={p.id} />
            <div className="mb-4 space-y-3"><Input label="Refund amount (₹)" name="amount" type="number" step="0.01" max={(p.finalAmount - refunded) / 100} required defaultValue={(p.finalAmount - refunded) / 100} /><Textarea label="Reason" name="reason" required /></div>
          </ConfirmForm>
        </Card>
      )}
    </div>
  );
}

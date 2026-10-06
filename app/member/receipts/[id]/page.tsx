import { notFound, redirect } from "next/navigation";
import { getAuth } from "@/server/auth/guard";
import { Card } from "@/components/ui/card";
import { PrintButton } from "@/components/print-button";
import { fmtDate, fullName } from "@/lib/format";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata = { title: "Receipt" };

export default async function MemberReceipt({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAuth();
  if (!ctx?.db || ctx.user.role !== "MEMBER") redirect("/login");
  const me = await ctx.db.member.findFirst({ where: { userId: ctx.user.id } });
  if (!me) notFound();
  // Ownership enforced in the query: payment must belong to THIS member (and this gym).
  const p = await ctx.db.payment.findFirst({ where: { id, memberId: me.id }, include: { invoice: true, membership: { include: { plan: true } } } });
  if (!p || !p.invoice) notFound();
  const gym = await ctx.db.gym.findFirstOrThrow();
  return (
    <div><div className="mb-3 print:hidden"><PrintButton label="Download PDF / Print" /></div>
      <Card className="bg-white p-6 text-black print:border-0">
        <div className="flex justify-between border-b border-gray-200 pb-4"><div><h1 className="text-lg font-extrabold">{gym.name}</h1><p className="text-xs text-gray-600">{[gym.address, gym.city].filter(Boolean).join(", ")}</p>{gym.gstin && <p className="text-xs text-gray-600">GSTIN: {gym.gstin}</p>}</div><div className="text-right text-sm"><p className="font-bold">{p.invoice.number}</p><p className="text-xs text-gray-600">{fmtDate(p.paidAt)}</p></div></div>
        <dl className="grid grid-cols-2 gap-y-1.5 py-4 text-sm"><dt className="text-gray-500">Member</dt><dd>{fullName(me)} ({me.memberCode})</dd><dt className="text-gray-500">Membership</dt><dd>{p.membership?.plan.name ?? "—"}</dd><dt className="text-gray-500">Method</dt><dd>{p.method.replace("_", " ")}</dd></dl>
        <p className="border-t border-gray-300 pt-3 text-right text-lg font-bold">Total paid {formatMoney(p.finalAmount)}</p></Card></div>
  );
}

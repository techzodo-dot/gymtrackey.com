import { prisma } from "@/server/db/prisma";
import { EmptyState, PageHeader, StatusBadge, TableWrap, Td, Th } from "@/components/ui/page";
import { fmtDate } from "@/lib/format";
import { formatMoney } from "@/lib/money";

export const metadata = { title: "Payments · Admin" };

export default async function AdminPayments() {
  const rows = await prisma.subscription.findMany({ where: { status: { not: "PENDING" }, razorpayPaymentId: { not: null } }, orderBy: { createdAt: "desc" }, take: 100, include: { tenant: { select: { name: true } }, plan: true } });
  return (
    <>
      <PageHeader title="Subscription payments" subtitle="Razorpay transactions from gyms." />
      {rows.length === 0 ? <EmptyState title="No subscription payments yet." /> : <TableWrap><thead><tr><Th>Date</Th><Th>Gym</Th><Th>Plan</Th><Th>Amount</Th><Th>Payment ID</Th><Th>Status</Th></tr></thead><tbody>
        {rows.map((s) => <tr key={s.id}><Td>{fmtDate(s.createdAt)}</Td><Td>{s.tenant.name}</Td><Td>{s.plan.name}</Td><Td>{formatMoney(s.amount)}</Td><Td className="text-xs">{s.razorpayPaymentId}</Td><Td><StatusBadge status={s.status} /></Td></tr>)}</tbody></TableWrap>}
    </>
  );
}

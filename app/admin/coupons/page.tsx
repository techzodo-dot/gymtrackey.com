import { prisma } from "@/server/db/prisma";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormGrid, Input, Select } from "@/components/ui/form";
import { EmptyState, Flash, PageHeader, StatusBadge, TableWrap, Td, Th } from "@/components/ui/page";
import { fmtDate } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { createCouponAction, toggleCouponAction } from "../actions";

export const metadata = { title: "Coupons · Admin" };

export default async function Coupons({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const [coupons, plans] = await Promise.all([prisma.coupon.findMany({ orderBy: { createdAt: "desc" } }), prisma.subscriptionPlan.findMany({ where: { isCustom: false }, orderBy: { sortOrder: "asc" } })]);
  return (
    <>
      <PageHeader title="Coupons" /><Flash ok={sp.ok} error={sp.error} />
      {coupons.length === 0 ? <EmptyState title="No coupons yet." /> : <TableWrap><thead><tr><Th>Code</Th><Th>Discount</Th><Th>Plans</Th><Th>Used</Th><Th>Expires</Th><Th>Status</Th><Th /></tr></thead><tbody>
        {coupons.map((c) => <tr key={c.id}><Td className="font-mono font-semibold">{c.code}</Td><Td>{c.discountType === "PERCENTAGE" ? `${c.discountValue}%${c.maxDiscount ? ` (max ${formatMoney(c.maxDiscount)})` : ""}` : formatMoney(c.discountValue)}</Td><Td className="text-xs">{c.planCodes.join(", ") || "All"}</Td><Td>{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ""}</Td><Td>{fmtDate(c.expiresAt)}</Td><Td><StatusBadge status={c.isActive ? "ACTIVE" : "CANCELLED"} /></Td>
          <Td><form action={toggleCouponAction}><input type="hidden" name="id" value={c.id} /><Button variant="ghost" type="submit" className="px-2 py-1">{c.isActive ? "Disable" : "Enable"}</Button></form></Td></tr>)}</tbody></TableWrap>}
      <Card className="mt-8 max-w-2xl"><h2 className="mb-4 text-lg font-bold">Create coupon</h2><form action={createCouponAction} className="space-y-4"><FormGrid>
        <Input label="Code *" name="code" required placeholder="LAUNCH20" /><Select label="Type" name="discountType" options={[["PERCENTAGE", "Percentage"], ["FIXED", "Fixed amount (₹)"]]} />
        <Input label="Value *" name="discountValue" type="number" step="0.01" required hint="% or ₹" /><Input label="Max discount (₹)" name="maxDiscount" type="number" step="0.01" /><Input label="Expiry date" name="expiresAt" type="date" /><Input label="Usage limit" name="usageLimit" type="number" min={1} /></FormGrid>
        <fieldset><legend className="mb-2 text-sm font-semibold">Applicable plans (none = all)</legend><div className="flex flex-wrap gap-4">{plans.map((p) => <label key={p.code} className="flex items-center gap-2 text-sm"><input type="checkbox" name="planCodes" value={p.code} className="accent-[var(--brand-to)]" />{p.name}</label>)}</div></fieldset>
        <Button type="submit">Create coupon</Button></form></Card>
    </>
  );
}

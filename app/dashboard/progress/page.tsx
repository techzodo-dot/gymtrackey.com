import Link from "next/link";
import { pageAuth } from "@/server/auth/page";
import { EmptyState, PageHeader, TableWrap, Td, Th } from "@/components/ui/page";
import { fmtDate, fullName } from "@/lib/format";

export const metadata = { title: "Progress" };

export default async function Progress() {
  const { db } = await pageAuth("measurements");
  const members = await db.member.findMany({ where: { deletedAt: null, measurements: { some: {} } }, include: { measurements: { orderBy: { measuredAt: "asc" } } }, take: 100 });
  return (
    <>
      <PageHeader title="Progress" subtitle="Body measurements and trends. Open a member to add a new measurement." />
      {members.length === 0 ? <EmptyState title="No measurements yet." body="Open a member → Measurements tab to record weight, BMI and body measurements." /> : (
        <TableWrap><thead><tr><Th>Member</Th><Th>Last measured</Th><Th>Weight</Th><Th>Change</Th><Th>BMI</Th><Th>Entries</Th></tr></thead><tbody>
          {members.map((m) => {
            const first = m.measurements[0]!, last = m.measurements.at(-1)!;
            const d = first.weightKg && last.weightKg ? Number(last.weightKg) - Number(first.weightKg) : null;
            return <tr key={m.id}><Td><Link className="font-semibold hover:text-brand" href={`/dashboard/members/${m.id}?tab=measurements`}>{fullName(m)}</Link></Td><Td>{fmtDate(last.measuredAt)}</Td><Td>{last.weightKg ? `${last.weightKg} kg` : "—"}</Td>
              <Td className={d != null && d < 0 ? "text-brand" : ""}>{d == null ? "—" : `${d > 0 ? "+" : ""}${d.toFixed(1)} kg`}</Td><Td>{last.bmi?.toString() ?? "—"}</Td><Td>{m.measurements.length}</Td></tr>;
          })}</tbody></TableWrap>
      )}
    </>
  );
}

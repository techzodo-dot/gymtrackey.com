import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { EmptyState, PageHeader, Pagination, SearchBar, StatusBadge, TableWrap, Td, Th } from "@/components/ui/page";
import { selectClass } from "@/components/ui/form";
import { fmtDate } from "@/lib/format";

export const metadata = { title: "Gyms · Admin" };
const PAGE = 20;

export default async function Gyms({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  const sp = await searchParams;
  const where: Prisma.TenantWhereInput = { deletedAt: null };
  if (sp.status) where.status = sp.status as never;
  if (sp.q) where.OR = [{ name: { contains: sp.q, mode: "insensitive" } }, { users: { some: { email: { contains: sp.q, mode: "insensitive" } } } }, { gym: { city: { contains: sp.q, mode: "insensitive" } } }];
  const page = Math.max(1, Number(sp.page) || 1);
  const [rows, total] = await Promise.all([
    prisma.tenant.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE, include: { gym: true, _count: { select: { members: true } }, users: { where: { role: "OWNER" }, take: 1 } } }),
    prisma.tenant.count({ where }),
  ]);
  return (
    <>
      <PageHeader title="Gyms" subtitle={`${total} total`} />
      <SearchBar action="/admin/gyms" q={sp.q} placeholder="Gym name, owner email or city"><select name="status" defaultValue={sp.status ?? ""} aria-label="Status" className={`${selectClass} w-auto`}><option value="">All statuses</option>{["TRIAL", "ACTIVE", "PAST_DUE", "CANCELLED", "EXPIRED", "SUSPENDED"].map((s) => <option key={s}>{s}</option>)}</select></SearchBar>
      {rows.length === 0 ? <EmptyState title="No gyms found." /> : <><TableWrap><thead><tr><Th>Gym</Th><Th>Owner</Th><Th>Plan</Th><Th>Members</Th><Th>Joined</Th><Th>Status</Th></tr></thead><tbody>
        {rows.map((t) => <tr key={t.id} className="hover:bg-surface2/50"><Td><Link href={`/admin/gyms/${t.id}`} className="font-semibold hover:text-brand">{t.name}</Link>{t.isDemo && <span className="ml-2 text-xs text-muted">(demo)</span>}<div className="text-xs text-muted">{t.gym?.city}</div></Td><Td className="text-xs">{t.users[0]?.email}</Td><Td>{t.planCode}</Td><Td>{t._count.members}</Td><Td>{fmtDate(t.createdAt)}</Td><Td><StatusBadge status={t.status} /></Td></tr>)}</tbody></TableWrap>
        <Pagination page={page} total={total} pageSize={PAGE} basePath="/admin/gyms" params={{ q: sp.q, status: sp.status }} /></>}
    </>
  );
}

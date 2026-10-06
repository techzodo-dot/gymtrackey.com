import Link from "next/link";
import { pageAuth } from "@/server/auth/page";
import { listMembers } from "@/server/services/members";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, Flash, PageHeader, Pagination, SearchBar, StatusBadge, TableWrap, Td, Th } from "@/components/ui/page";
import { selectClass } from "@/components/ui/form";
import { fmtDate, fullName } from "@/lib/format";

export const metadata = { title: "Members" };
type SP = { q?: string; status?: string; plan?: string; trainer?: string; sort?: string; page?: string; ok?: string; error?: string };

export default async function MembersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { db } = await pageAuth("members");
  const [{ rows, total, page, pageSize }, plans, trainers] = await Promise.all([
    listMembers(db, { q: sp.q, status: sp.status, planId: sp.plan, trainerId: sp.trainer, sort: sp.sort, page: Number(sp.page) || 1 }),
    db.membershipPlan.findMany({ select: { id: true, name: true } }),
    db.trainer.findMany({ select: { id: true, name: true } }),
  ]);
  const params = { q: sp.q, status: sp.status, plan: sp.plan, trainer: sp.trainer, sort: sp.sort };
  const exportQs = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <>
      <PageHeader title="Members" subtitle={`${total} member${total === 1 ? "" : "s"}`}
        actions={<>
          <ButtonLink href={`/api/export/members?${exportQs}`} variant="secondary">Export CSV</ButtonLink>
          <ButtonLink href="/dashboard/members/import" variant="secondary">Import CSV</ButtonLink>
          <ButtonLink href="/dashboard/members/new">Add Member</ButtonLink>
        </>} />
      <Flash ok={sp.ok} error={sp.error} />
      <SearchBar action="/dashboard/members" q={sp.q} placeholder="Search name, phone, email or member ID">
        <select name="status" defaultValue={sp.status ?? ""} aria-label="Status" className={`${selectClass} w-auto`}>
          <option value="">All statuses</option>{["ACTIVE", "EXPIRED", "SUSPENDED", "INACTIVE"].map((s) => <option key={s}>{s}</option>)}
        </select>
        <select name="plan" defaultValue={sp.plan ?? ""} aria-label="Plan" className={`${selectClass} w-auto`}>
          <option value="">All plans</option>{plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select name="trainer" defaultValue={sp.trainer ?? ""} aria-label="Trainer" className={`${selectClass} w-auto`}>
          <option value="">All trainers</option>{trainers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select name="sort" defaultValue={sp.sort ?? ""} aria-label="Sort" className={`${selectClass} w-auto`}>
          <option value="">Newest first</option><option value="oldest">Oldest first</option><option value="name">Name A–Z</option>
        </select>
      </SearchBar>

      {rows.length === 0 ? (
        <EmptyState title={sp.q || sp.status ? "No members match your filters." : "No members yet."} body="Add your first member to start tracking memberships, fees and attendance."
          action={<ButtonLink href="/dashboard/members/new">Add Your First Member</ButtonLink>} />
      ) : (
        <>
          <TableWrap>
            <thead><tr><Th>Member</Th><Th>Phone</Th><Th>Plan</Th><Th>Valid till</Th><Th>Trainer</Th><Th>Status</Th></tr></thead>
            <tbody>
              {rows.map((m) => {
                const ms = m.memberships[0];
                return (
                  <tr key={m.id} className="hover:bg-surface2/50">
                    <Td><Link className="font-semibold hover:text-brand" href={`/dashboard/members/${m.id}`}>{fullName(m)}</Link><div className="text-xs text-muted">{m.memberCode}</div></Td>
                    <Td>{m.phone}</Td><Td>{ms?.plan.name ?? "—"}</Td><Td>{fmtDate(ms?.endDate)}</Td><Td>{m.trainer?.name ?? "—"}</Td>
                    <Td><StatusBadge status={m.status} /></Td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
          <Pagination page={page} total={total} pageSize={pageSize} basePath="/dashboard/members" params={params} />
        </>
      )}
    </>
  );
}

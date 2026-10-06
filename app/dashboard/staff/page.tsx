import { pageAuth } from "@/server/auth/page";
import { effectivePermissions } from "@/server/auth/permissions";
import { usage, getPlan } from "@/server/services/limits";
import { Card } from "@/components/ui/card";
import { ConfirmForm } from "@/components/ui/confirm";
import { PageHeader, StatusBadge, TableWrap, Td, Th } from "@/components/ui/page";
import { StaffForm } from "@/components/dashboard/staff-form";
import { fmtDate } from "@/lib/format";
import { removeStaffAction } from "./actions";

export const metadata = { title: "Staff" };

export default async function Staff() {
  const { db, tenant } = await pageAuth("staff");
  const [users, u, plan] = await Promise.all([db.user.findMany({ where: { role: { not: "MEMBER" } }, orderBy: { createdAt: "asc" } }), usage(db), getPlan(tenant)]);
  return (
    <>
      <PageHeader title="Staff" subtitle={`${u.staff} of ${plan?.staffLimit ?? "unlimited"} staff seats used (the owner is free)`} />
      <TableWrap><thead><tr><Th>Name</Th><Th>Email</Th><Th>Role</Th><Th>Permissions</Th><Th>Added</Th><Th>Status</Th><Th /></tr></thead><tbody>
        {users.map((s) => <tr key={s.id}><Td className="font-semibold">{s.name}</Td><Td>{s.email}</Td><Td>{s.role}</Td><Td className="max-w-[240px] truncate text-xs text-muted">{effectivePermissions(s.role, s.permissions).join(", ")}</Td><Td>{fmtDate(s.createdAt)}</Td><Td><StatusBadge status={s.isActive ? "ACTIVE" : "CANCELLED"} /></Td>
          <Td>{s.role !== "OWNER" && s.isActive && <ConfirmForm action={removeStaffAction} title={`Remove ${s.name}?`} message="They will lose access immediately." label="Remove" confirmLabel="Remove"><input type="hidden" name="id" value={s.id} /></ConfirmForm>}</Td></tr>)}</tbody></TableWrap>
      <Card className="mt-8 max-w-3xl"><h2 className="mb-4 text-lg font-bold">Add staff</h2><StaffForm /></Card>
    </>
  );
}

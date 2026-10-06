import { pageAuth } from "@/server/auth/page";
import { featureEnabled, usage, getPlan } from "@/server/services/limits";
import { Card } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { ConfirmForm } from "@/components/ui/confirm";
import { FormGrid, Input } from "@/components/ui/form";
import { Flash, PageHeader, StatusBadge } from "@/components/ui/page";
import { createBranchAction, deactivateBranchAction } from "./actions";

export const metadata = { title: "Branches" };

export default async function Branches({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const { db, tenant } = await pageAuth("branches");
  const [branches, multi, u, plan] = await Promise.all([db.branch.findMany({ orderBy: { createdAt: "asc" }, include: { _count: { select: { members: { where: { deletedAt: null } } } } } }), featureEnabled(tenant, "multiBranch"), usage(db), getPlan(tenant)]);
  return (
    <>
      <PageHeader title="Branches" subtitle={`${u.branches} of ${plan?.branchLimit ?? "unlimited"} branches used`} /><Flash ok={sp.ok} error={sp.error} />
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        {branches.map((b) => <Card key={b.id}><div className="flex justify-between"><div><h2 className="font-bold">{b.name}{b.isDefault && <span className="ml-2 text-xs text-muted">(main)</span>}</h2><p className="text-sm text-muted">{[b.address, b.city].filter(Boolean).join(", ") || "—"}</p><p className="mt-1 text-xs text-muted">{b._count.members} members</p></div><StatusBadge status={b.isActive ? "ACTIVE" : "CANCELLED"} /></div>
          {!b.isDefault && b.isActive && <div className="mt-3"><ConfirmForm action={deactivateBranchAction} title="Deactivate this branch?" message="Members and history are kept, but the branch is hidden from selection." label="Deactivate" confirmLabel="Deactivate"><input type="hidden" name="id" value={b.id} /></ConfirmForm></div>}</Card>)}
      </div>
      {multi ? <Card className="max-w-2xl"><h2 className="mb-4 text-lg font-bold">Add branch</h2><form action={createBranchAction} className="space-y-4"><FormGrid><Input label="Branch name *" name="name" required /><Input label="City" name="city" /><Input label="Phone" name="phone" /><Input label="Address" name="address" /></FormGrid><Button type="submit">Add branch</Button></form></Card>
        : <Card className="max-w-2xl"><h2 className="font-bold">Multiple branches</h2><p className="mt-1 text-sm text-muted">Managing several locations is available on the Professional and Enterprise plans.</p><ButtonLink href="/dashboard/billing" className="mt-4">Upgrade Plan</ButtonLink></Card>}
    </>
  );
}

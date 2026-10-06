import { pageAuth } from "@/server/auth/page";
import { MemberForm } from "@/components/dashboard/member-form";
import { Flash, PageHeader } from "@/components/ui/page";
import { createMemberAction } from "../actions";

export const metadata = { title: "Add member" };

export default async function NewMember({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { db } = await pageAuth("members");
  const [plans, trainers, branches] = await Promise.all([
    db.membershipPlan.findMany({ where: { isActive: true }, select: { id: true, name: true, price: true } }),
    db.trainer.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
    db.branch.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
  ]);
  return (
    <div className="max-w-3xl">
      <PageHeader title="Add member" />
      <Flash error={error} />
      <MemberForm action={createMemberAction} plans={plans} trainers={trainers} branches={branches} submit="Save member" withPlan />
    </div>
  );
}

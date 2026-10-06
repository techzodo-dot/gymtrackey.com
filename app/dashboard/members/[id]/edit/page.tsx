import { notFound } from "next/navigation";
import { pageAuth } from "@/server/auth/page";
import { MemberForm } from "@/components/dashboard/member-form";
import { Flash, PageHeader } from "@/components/ui/page";
import { updateMemberAction } from "../../actions";

export const metadata = { title: "Edit member" };

export default async function EditMember({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const { db } = await pageAuth("members");
  const member = await db.member.findFirst({ where: { id, deletedAt: null } });
  if (!member) notFound();
  const [trainers, branches] = await Promise.all([db.trainer.findMany({ where: { isActive: true }, select: { id: true, name: true } }), db.branch.findMany({ select: { id: true, name: true } })]);
  return (
    <div className="max-w-3xl">
      <PageHeader title={`Edit ${member.firstName}`} />
      <Flash error={error} />
      <MemberForm action={updateMemberAction} member={member} trainers={trainers} branches={branches} submit="Save changes" />
    </div>
  );
}

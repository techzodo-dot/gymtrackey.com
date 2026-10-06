import { redirect } from "next/navigation";
import { getAuth } from "@/server/auth/guard";
import { Card, Badge } from "@/components/ui/card";
import { Logo } from "@/components/logo";

export const dynamic = "force-dynamic";
export const metadata = { title: "My membership" };

export default async function MemberHome() {
  const ctx = await getAuth();
  if (!ctx?.db || ctx.user.role !== "MEMBER") redirect("/login");
  // A member only ever resolves their own record: scoped by tenant AND by their own user id.
  const member = await ctx.db.member.findFirst({
    where: { userId: ctx.user.id },
    include: { memberships: { orderBy: { endDate: "desc" }, take: 1, include: { plan: true } } },
  });
  const current = member?.memberships[0];
  return (
    <main className="mx-auto max-w-lg space-y-4 p-4">
      <Logo href="/member" />
      <Card>
        <p className="text-sm text-muted">{ctx.tenant?.name}</p>
        <h1 className="text-2xl font-bold">{member?.firstName ?? ctx.user.name}</h1>
        {current ? (
          <p className="mt-2 text-sm">{current.plan.name} · valid till {current.endDate.toLocaleDateString("en-IN")} <Badge tone={current.status === "ACTIVE" ? "good" : "bad"}>{current.status}</Badge></p>
        ) : <p className="mt-2 text-sm text-muted">No active membership.</p>}
      </Card>
    </main>
  );
}

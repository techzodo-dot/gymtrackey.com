import { redirect } from "next/navigation";
import { getAuth } from "@/server/auth/guard";
import { prisma } from "@/server/db/prisma";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/logo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Super Admin" };

export default async function Admin() {
  const ctx = await getAuth();
  if (!ctx || ctx.user.role !== "SUPER_ADMIN") redirect("/login");

  const [gyms, trial, active, expired, members, leads] = await Promise.all([
    prisma.tenant.count({ where: { deletedAt: null } }),
    prisma.tenant.count({ where: { status: "TRIAL" } }),
    prisma.tenant.count({ where: { status: "ACTIVE" } }),
    prisma.tenant.count({ where: { status: "EXPIRED" } }),
    prisma.member.count(),
    prisma.lead.count({ where: { status: "NEW" } }),
  ]);
  const cards: [string, number][] = [["Total gyms", gyms], ["Active gyms", active], ["Trial gyms", trial], ["Expired gyms", expired], ["Total members", members], ["New leads", leads]];

  return (
    <main className="mx-auto max-w-6xl p-6">
      <Logo href="/admin" />
      <h1 className="mt-6 text-2xl font-bold">Platform overview</h1>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        {cards.map(([l, v]) => <Card key={l} className="p-4"><p className="text-xs text-muted">{l}</p><p className="mt-1 text-3xl font-bold">{v}</p></Card>)}
      </div>
    </main>
  );
}

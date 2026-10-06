import { redirect } from "next/navigation";
import { getAuth } from "@/server/auth/guard";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/logo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Trainer" };

export default async function TrainerHome() {
  const ctx = await getAuth();
  if (!ctx?.db || !["TRAINER", "OWNER", "MANAGER"].includes(ctx.user.role)) redirect("/login");
  const trainer = await ctx.db.trainer.findFirst({ where: { userId: ctx.user.id } });
  const members = trainer ? await ctx.db.member.findMany({ where: { trainerId: trainer.id, deletedAt: null }, take: 50 }) : [];
  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4">
      <Logo href="/trainer" />
      <h1 className="text-2xl font-bold">My members</h1>
      {members.length === 0 ? <Card className="text-center text-muted">No assigned members yet.</Card> :
        members.map((m) => <Card key={m.id} className="p-4">{m.firstName} {m.lastName} · {m.phone}</Card>)}
    </main>
  );
}

import { redirect } from "next/navigation";
import { getAuth } from "@/server/auth/guard";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export const dynamic = "force-dynamic";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuth();
  if (!ctx || ctx.user.role !== "MEMBER") redirect("/login");
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-bg/80 px-4 backdrop-blur"><Logo href="/member" />
        <div className="flex items-center gap-1"><ThemeToggle /><form action="/api/auth/logout" method="post"><button formAction="/api/auth/logout" className="rounded-lg px-3 py-1.5 text-sm text-muted hover:bg-surface2">Log out</button></form></div></header>
      <main className="mx-auto max-w-2xl p-4">{children}</main>
    </div>
  );
}

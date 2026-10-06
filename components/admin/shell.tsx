import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV = [["Overview", "/admin"], ["Gyms", "/admin/gyms"], ["Payments", "/admin/payments"], ["Plans & pricing", "/admin/plans"], ["Coupons", "/admin/coupons"], ["Leads", "/admin/leads"], ["Support", "/admin/tickets"], ["Blog", "/admin/blog"], ["Settings", "/admin/settings"]] as const;

export function AdminShell({ children, badges = {} }: { children: React.ReactNode; badges?: Record<string, number> }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[230px_1fr]">
      <aside className="border-b border-line bg-surface p-4 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between"><Logo href="/admin" /><div className="lg:hidden"><ThemeToggle /></div></div>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted">Super admin</p>
        <nav aria-label="Admin" className="mt-4 flex gap-1 overflow-x-auto lg:flex-col">
          {NAV.map(([l, h]) => <Link key={h} href={h} className="flex items-center justify-between whitespace-nowrap rounded-xl px-3 py-2 text-sm text-muted hover:bg-surface2 hover:text-fg">{l}{badges[h] ? <span className="ml-2 rounded-full bg-danger px-1.5 text-[10px] font-bold text-white">{badges[h]}</span> : null}</Link>)}
        </nav>
        <form action="/api/auth/logout" method="post" className="mt-4 hidden lg:block"><button formAction="/api/auth/logout" className="px-3 text-sm text-muted hover:text-fg">Log out</button></form>
      </aside>
      <main className="min-w-0 p-4 sm:p-6">{children}</main>
    </div>
  );
}

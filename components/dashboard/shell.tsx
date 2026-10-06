import Link from "next/link";
import { BarChart3, CalendarCheck, CreditCard, Dumbbell, GitBranch, Home, LifeBuoy, Settings, Users, Wallet, Bell, Layers, UserCog, Salad, Receipt, Camera, MoreHorizontal } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Permission } from "@/server/auth/permissions";

type Item = { href: string; label: string; icon: React.ElementType; perm?: Permission };
export const NAV: Item[] = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/dashboard/members", label: "Members", icon: Users, perm: "members" },
  { href: "/dashboard/memberships", label: "Memberships", icon: Layers, perm: "memberships" },
  { href: "/dashboard/payments", label: "Payments", icon: Wallet, perm: "payments" },
  { href: "/dashboard/attendance", label: "Attendance", icon: CalendarCheck, perm: "attendance" },
  { href: "/dashboard/trainers", label: "Trainers", icon: UserCog, perm: "trainers" },
  { href: "/dashboard/workouts", label: "Workout Plans", icon: Dumbbell, perm: "workouts" },
  { href: "/dashboard/diets", label: "Diet Plans", icon: Salad, perm: "diets" },
  { href: "/dashboard/progress", label: "Progress", icon: Camera, perm: "measurements" },
  { href: "/dashboard/expenses", label: "Expenses", icon: Receipt, perm: "expenses" },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3, perm: "reports" },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell, perm: "notifications" },
  { href: "/dashboard/staff", label: "Staff", icon: Users, perm: "staff" },
  { href: "/dashboard/branches", label: "Branches", icon: GitBranch, perm: "branches" },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, perm: "settings" },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard, perm: "billing" },
  { href: "/dashboard/support", label: "Support", icon: LifeBuoy, perm: "support" },
];

export function DashboardShell({ items, gymName, userName, banner, children }: {
  items: Item[]; gymName: string; userName: string; banner?: React.ReactNode; children: React.ReactNode;
}) {
  const mobile = items.filter((i) => ["Dashboard", "Members", "Attendance", "Payments"].includes(i.label));
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="hidden border-r border-line bg-surface lg:block">
        <div className="sticky top-0 flex h-dvh flex-col p-4">
          <Logo href="/dashboard" />
          <nav aria-label="Sidebar" className="mt-6 flex-1 space-y-0.5 overflow-y-auto">
            {items.map((i) => (
              <Link key={i.href} href={i.href} className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted hover:bg-surface2 hover:text-fg">
                <i.icon size={18} aria-hidden />{i.label}
              </Link>
            ))}
          </nav>
        </div>
      </aside>
      <div className="min-w-0 pb-20 lg:pb-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-line bg-bg/80 px-4 backdrop-blur">
          <div className="lg:hidden"><Logo href="/dashboard" /></div>
          <p className="hidden text-sm font-semibold lg:block">{gymName}</p>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <span className="hidden text-sm text-muted sm:block">{userName}</span>
            <form action="/api/auth/logout" method="post"><LogoutButton /></form>
          </div>
        </header>
        {banner}
        <main className="p-4 sm:p-6">{children}</main>
      </div>
      <nav aria-label="Mobile" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-surface lg:hidden">
        {mobile.map((i) => (
          <Link key={i.href} href={i.href} className="flex flex-col items-center gap-1 py-2.5 text-[11px] text-muted"><i.icon size={20} aria-hidden />{i.label}</Link>
        ))}
        <Link href="/dashboard/settings" className="flex flex-col items-center gap-1 py-2.5 text-[11px] text-muted"><MoreHorizontal size={20} aria-hidden />More</Link>
      </nav>
    </div>
  );
}

function LogoutButton() {
  return <button formAction="/api/auth/logout" className="rounded-lg px-3 py-1.5 text-sm text-muted hover:bg-surface2 hover:text-fg" type="submit">Log out</button>;
}

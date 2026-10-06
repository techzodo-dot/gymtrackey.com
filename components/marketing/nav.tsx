import Link from "next/link";
import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const links = [["Features", "/features"], ["Pricing", "/pricing"], ["Demo", "/demo"], ["About", "/about"], ["Contact", "/contact"]] as const;

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Logo />
        <nav aria-label="Main" className="hidden gap-7 text-sm text-muted md:flex">
          {links.map(([l, h]) => <Link key={h} href={h} className="hover:text-fg">{l}</Link>)}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login" className="hidden px-3 text-sm text-muted hover:text-fg sm:block">Log in</Link>
          <ButtonLink href="/register" className="whitespace-nowrap px-3 py-2 sm:px-4"><span className="sm:hidden">Free Trial</span><span className="hidden sm:inline">Start Free Trial</span></ButtonLink>
        </div>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-line py-12 text-sm text-muted">
      <div className="mx-auto flex max-w-6xl flex-col justify-between gap-6 px-4 sm:flex-row">
        <div><Logo /><p className="mt-3 max-w-xs">Track Members. Manage Fees. Grow Your Gym.</p></div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
          {[["Pricing", "/pricing"], ["Features", "/features"], ["Terms", "/terms"], ["Privacy", "/privacy"], ["Refund policy", "/refund-policy"], ["Contact", "/contact"]].map(([l, h]) => (
            <Link key={h} href={h!} className="hover:text-fg">{l}</Link>
          ))}
        </nav>
      </div>
      <p className="mx-auto mt-8 max-w-6xl px-4">© {new Date().getFullYear()} GymTrackey. All rights reserved.</p>
    </footer>
  );
}

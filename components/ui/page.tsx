import Link from "next/link";
import { cn } from "@/lib/cn";
import { Badge } from "./card";
import { ButtonLink } from "./button";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-2xl font-bold">{title}</h1>{subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}</div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** Success / error banner driven by ?ok= / ?error= (set by server actions). */
export function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null;
  const upgrade = !!error && /limit|isn't included|upgrade/i.test(error);
  return (
    <div role={error ? "alert" : "status"} className={cn("mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm", error ? "bg-danger/10 text-danger" : "bg-brand/10 text-brand")}>
      <span>{error ?? ok}</span>
      {upgrade && <span className="flex gap-2"><ButtonLink href="/dashboard/billing" className="px-3 py-1.5">Upgrade Plan</ButtonLink><ButtonLink href="/pricing" variant="secondary" className="px-3 py-1.5">View Plans</ButtonLink></span>}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-card border border-dashed border-line p-10 text-center">
      <h2 className="text-lg font-bold">{title}</h2>
      {body && <p className="mx-auto mt-1 max-w-md text-sm text-muted">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function TableWrap({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto rounded-card border border-line bg-surface"><table className="w-full min-w-[640px] text-left text-sm">{children}</table></div>;
}
export const Th = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
  <th scope="col" className={cn("border-b border-line px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted", className)}>{children}</th>
);
export const Td = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
  <td className={cn("border-b border-line/60 px-4 py-3 align-middle", className)}>{children}</td>
);

export function Pagination({ page, total, pageSize, basePath, params }: { page: number; total: number; pageSize: number; basePath: string; params: Record<string, string | undefined> }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return <p className="mt-3 text-xs text-muted">{total} result{total === 1 ? "" : "s"}</p>;
  const href = (p: number) => { const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]); q.set("page", String(p)); return `${basePath}?${q}`; };
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm">
      <span className="text-muted">Page {page} of {pages} · {total} results</span>
      <span className="flex gap-2">
        {page > 1 && <Link className="rounded-lg border border-line px-3 py-1.5 hover:bg-surface2" href={href(page - 1)}>Previous</Link>}
        {page < pages && <Link className="rounded-lg border border-line px-3 py-1.5 hover:bg-surface2" href={href(page + 1)}>Next</Link>}
      </span>
    </nav>
  );
}

const TONE: Record<string, "good" | "warn" | "bad" | "neutral"> = {
  ACTIVE: "good", PAID: "good", PROCESSED: "good", RESOLVED: "good", CONVERTED: "good", SENT: "good",
  PENDING: "warn", FROZEN: "warn", PARTIAL: "warn", OPEN: "warn", TRIAL: "warn", IN_PROGRESS: "warn", NEW: "warn", SCHEDULED: "warn",
  EXPIRED: "bad", OVERDUE: "bad", SUSPENDED: "bad", CANCELLED: "bad", FAILED: "bad", LOST: "bad", REFUNDED: "bad", PAST_DUE: "bad",
};
export const StatusBadge = ({ status }: { status: string }) => <Badge tone={TONE[status] ?? "neutral"}>{status.replace(/_/g, " ")}</Badge>;

export function Stat({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: string; tone?: "warn" | "bad" | "good" }) {
  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold", tone === "bad" && "text-danger", tone === "warn" && "text-warn", tone === "good" && "text-brand")}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  );
}

export function Tabs({ tabs, active, base }: { tabs: readonly (readonly [string, string])[]; active: string; base: string }) {
  return (
    <div role="tablist" className="mb-5 flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map(([k, l]) => (
        <Link key={k} role="tab" aria-selected={k === active} href={`${base}?tab=${k}`}
          className={cn("whitespace-nowrap border-b-2 px-4 py-2.5 text-sm", k === active ? "border-brand2 font-semibold text-fg" : "border-transparent text-muted hover:text-fg")}>{l}</Link>
      ))}
    </div>
  );
}

export function SearchBar({ action, q, placeholder = "Search…", children }: { action: string; q?: string; placeholder?: string; children?: React.ReactNode }) {
  return (
    <form action={action} method="get" role="search" className="mb-4 flex flex-wrap items-end gap-2">
      <input name="q" defaultValue={q} placeholder={placeholder} aria-label="Search" className="min-w-[200px] flex-1 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-brand2" />
      {children}
      <button className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold hover:bg-surface2">Search</button>
    </form>
  );
}

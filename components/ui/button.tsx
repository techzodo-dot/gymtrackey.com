import Link from "next/link";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
const base =
  "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition disabled:opacity-60 disabled:pointer-events-none";
const variants: Record<Variant, string> = {
  primary: "gt-gradient-bg text-black hover:brightness-110 shadow-lg shadow-brand2/20",
  secondary: "border border-line bg-surface text-fg hover:bg-surface2",
  ghost: "text-muted hover:text-fg hover:bg-surface2",
  danger: "bg-danger text-white hover:brightness-110",
};

export function Button({ variant = "primary", className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={cn(base, variants[variant], className)} {...p} />;
}
export function ButtonLink({ variant = "primary", className, ...p }: React.ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={cn(base, variants[variant], className)} {...p} />;
}

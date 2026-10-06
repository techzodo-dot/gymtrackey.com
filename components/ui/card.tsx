import { cn } from "@/lib/cn";
export function Card({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-card border border-line bg-surface p-6", className)} {...p} />;
}
export function Badge({ tone = "neutral", className, ...p }: React.HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "good" | "warn" | "bad" }) {
  const tones = { neutral: "bg-surface2 text-muted", good: "bg-brand/15 text-brand", warn: "bg-warn/15 text-warn", bad: "bg-danger/15 text-danger" };
  return <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone], className)} {...p} />;
}

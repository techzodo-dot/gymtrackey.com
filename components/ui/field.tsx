import { cn } from "@/lib/cn";

type Props = React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string };

/** Labelled input with accessible error wiring. */
export function Field({ label, error, id, className, ...p }: Props) {
  const fid = id ?? p.name;
  return (
    <div>
      <label htmlFor={fid} className="mb-1.5 block text-sm font-medium">{label}</label>
      <input
        id={fid}
        aria-invalid={!!error}
        aria-describedby={error ? `${fid}-err` : undefined}
        className={cn("w-full rounded-xl border border-line bg-surface2 px-3.5 py-2.5 text-sm outline-none placeholder:text-muted focus:border-brand2", error && "border-danger", className)}
        {...p}
      />
      {error && <p id={`${fid}-err`} role="alert" className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

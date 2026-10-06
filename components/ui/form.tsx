import { cn } from "@/lib/cn";

const control = "w-full rounded-xl border border-line bg-surface2 px-3.5 py-2.5 text-sm outline-none placeholder:text-muted focus:border-brand2";

export function Label({ label, children, hint, className }: { label: string; children: React.ReactNode; hint?: string; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}
export function Input({ label, hint, className, wrap, ...p }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; wrap?: string }) {
  return <Label label={label} hint={hint} className={wrap}><input className={cn(control, className)} {...p} /></Label>;
}
export function Select({ label, options, hint, wrap, placeholder, className, ...p }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; options: readonly (readonly [string, string])[]; hint?: string; wrap?: string; placeholder?: string }) {
  return (
    <Label label={label} hint={hint} className={wrap}>
      <select className={cn(control, className)} {...p}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </Label>
  );
}
export function Textarea({ label, wrap, className, ...p }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; wrap?: string }) {
  return <Label label={label} className={wrap}><textarea rows={3} className={cn(control, className)} {...p} /></Label>;
}
export function FormGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid gap-4 sm:grid-cols-2", className)}>{children}</div>;
}
export const selectClass = control;

"use client";
export function PrintButton({ label = "Print" }: { label?: string }) {
  return <button type="button" onClick={() => window.print()} className="rounded-xl border border-line px-4 py-2 text-sm font-semibold hover:bg-surface2 print:hidden">{label}</button>;
}

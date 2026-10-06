"use client";
import { useState } from "react";
import { selectClass } from "./form";

type Col = { key: string; label: string; type?: "text" | "number" | "select"; options?: readonly (readonly [string, string])[]; width?: string; placeholder?: string };

/** Repeating rows posted as parallel arrays: `${prefix}_${key}` (read with readRows() on the server). */
export function RowsBuilder({ prefix, cols, initial = 1, addLabel = "Add row" }: { prefix: string; cols: Col[]; initial?: number; addLabel?: string }) {
  const [rows, setRows] = useState(Array.from({ length: initial }, (_, i) => i));
  const [next, setNext] = useState(initial);
  return (
    <div className="space-y-2">
      {rows.map((id) => (
        <div key={id} className="grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-[repeat(auto-fit,minmax(110px,1fr))]">
          {cols.map((c) => (
            <label key={c.key} className="block text-xs text-muted">
              {c.label}
              {c.type === "select" ? (
                <select name={`${prefix}_${c.key}`} className={`${selectClass} mt-1`}>{c.options!.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
              ) : (
                <input name={`${prefix}_${c.key}`} type={c.type ?? "text"} step={c.type === "number" ? "any" : undefined} placeholder={c.placeholder} className={`${selectClass} mt-1`} />
              )}
            </label>
          ))}
          {rows.length > 1 && <button type="button" onClick={() => setRows(rows.filter((r) => r !== id))} className="self-end rounded-lg px-2 py-2 text-xs text-danger hover:bg-danger/10">Remove</button>}
        </div>
      ))}
      <button type="button" onClick={() => { setRows([...rows, next]); setNext(next + 1); }} className="rounded-xl border border-line px-4 py-2 text-sm font-semibold hover:bg-surface2">+ {addLabel}</button>
    </div>
  );
}

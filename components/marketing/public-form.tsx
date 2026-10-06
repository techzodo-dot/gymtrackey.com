"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

type F = { name: string; label: string; type?: string; required?: boolean; textarea?: boolean };

export function PublicForm({ endpoint, fields, submit, success }: { endpoint: string; fields: F[]; submit: string; success: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("busy"); setErrors({}); setError("");
    const form = e.currentTarget;
    const body = Object.fromEntries([...new FormData(form).entries()].filter(([, v]) => v !== ""));
    const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    if (res?.ok) { setState("done"); form.reset(); return; }
    const data = await res?.json().catch(() => ({}));
    if (data?.issues) setErrors(Object.fromEntries(Object.entries(data.issues as Record<string, string[]>).map(([k, v]) => [k, v[0] ?? ""])));
    setError(data?.error ?? "Network error. Please try again.");
    setState("idle");
  }

  if (state === "done") return <p role="status" className="rounded-xl bg-brand/10 p-4 text-brand">{success}</p>;
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {fields.map((f) => f.textarea ? (
        <div key={f.name}>
          <label htmlFor={f.name} className="mb-1.5 block text-sm font-medium">{f.label}</label>
          <textarea id={f.name} name={f.name} rows={4} required={f.required} className="w-full rounded-xl border border-line bg-surface2 px-3.5 py-2.5 text-sm outline-none focus:border-brand2" />
          {errors[f.name] && <p role="alert" className="mt-1 text-xs text-danger">{errors[f.name]}</p>}
        </div>
      ) : <Field key={f.name} {...f} error={errors[f.name]} />)}
      {error && <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={state === "busy"} className="w-full">{state === "busy" ? "Sending…" : submit}</Button>
    </form>
  );
}

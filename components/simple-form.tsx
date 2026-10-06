"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

export function SimpleForm({ endpoint, fields, submit, success, extra, redirect }: { endpoint: string; fields: { name: string; label: string; type?: string; autoComplete?: string }[]; submit: string; success: string; extra?: Record<string, string>; redirect?: string }) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null); const [busy, setBusy] = useState(false); const [errs, setErrs] = useState<Record<string, string>>({});
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setMsg(null); setErrs({});
    const body = { ...Object.fromEntries(new FormData(e.currentTarget).entries()), ...extra };
    const r = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    setBusy(false);
    if (r?.ok) { setMsg({ ok: true, text: success }); if (redirect) setTimeout(() => (location.href = redirect), 1500); return; }
    if (d?.issues) setErrs(Object.fromEntries(Object.entries(d.issues as Record<string, string[]>).map(([k, v]) => [k, v[0] ?? ""])));
    setMsg({ ok: false, text: d?.error ?? "Network error." });
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {fields.map((f) => <Field key={f.name} {...f} error={errs[f.name]} required />)}
      {msg && <p role={msg.ok ? "status" : "alert"} className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-brand/10 text-brand" : "bg-danger/10 text-danger"}`}>{msg.text}</p>}
      <Button type="submit" disabled={busy} className="w-full">{busy ? "Please wait…" : submit}</Button>
    </form>
  );
}

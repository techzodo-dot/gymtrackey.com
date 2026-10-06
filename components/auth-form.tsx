"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

type FieldDef = { name: string; label: string; type?: string; autoComplete?: string };

/** Generic JSON form posting to an auth endpoint; surfaces server field errors accessibly. */
export function AuthForm({ endpoint, fields, submit, remember }: { endpoint: string; fields: FieldDef[]; submit: string; remember?: boolean }) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setErrors({}); setFormError("");
    const fd = new FormData(e.currentTarget);
    const body: Record<string, unknown> = Object.fromEntries(fd.entries());
    if (remember) body.remember = fd.get("remember") === "on";
    try {
      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (res.ok) {
        const next = new URLSearchParams(window.location.search).get("next");
        router.push(next && next.startsWith("/") && !next.startsWith("//") ? next : data.redirect);
        router.refresh();
        return;
      }
      if (data.issues) setErrors(Object.fromEntries(Object.entries(data.issues as Record<string, string[]>).map(([k, v]) => [k, v[0] ?? ""])));
      setFormError(data.error ?? "Something went wrong.");
    } catch {
      setFormError("Network error. Please try again.");
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {fields.map((f) => <Field key={f.name} {...f} error={errors[f.name]} required />)}
      {remember && (
        <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" name="remember" className="accent-[var(--brand-to)]" /> Remember me</label>
      )}
      {formError && <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{formError}</p>}
      <Button type="submit" disabled={busy} className="w-full">{busy ? "Please wait…" : submit}</Button>
    </form>
  );
}

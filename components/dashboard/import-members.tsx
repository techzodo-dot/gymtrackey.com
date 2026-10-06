"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type Preview = { valid: number; invalid: { row: number; error: string }[]; invalidCount: number; duplicate: { row: number; phone: string }[]; duplicateCount: number };

export function ImportMembers() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [msg, setMsg] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);

  async function send(commit: boolean) {
    if (!file) return;
    setBusy(true); setErr(""); setMsg("");
    const fd = new FormData(); fd.set("file", file);
    const res = await fetch(`/api/members/import${commit ? "?commit=1" : ""}`, { method: "POST", body: fd }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy(false);
    if (!res?.ok) { setErr(data?.error ?? "Upload failed."); return; }
    if (commit) { setMsg(`Imported ${data.imported} member(s).`); setPreview(null); setFile(null); } else setPreview(data);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">CSV columns: <code>name, phone, email, gender, dob, join date, membership, start date, end date, amount</code>. Only <b>name</b> and <b>phone</b> are required. Dates as YYYY-MM-DD.</p>
      <input type="file" accept=".csv,text/csv" aria-label="CSV file" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setPreview(null); setMsg(""); }} className="block text-sm" />
      <Button type="button" variant="secondary" disabled={!file || busy} onClick={() => send(false)}>Validate file</Button>
      {err && <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{err}</p>}
      {msg && <p role="status" className="rounded-lg bg-brand/10 px-3 py-2 text-sm text-brand">{msg}</p>}
      {preview && (
        <div className="space-y-3 rounded-card border border-line p-4 text-sm">
          <p><b className="text-brand">{preview.valid}</b> valid · <b className="text-danger">{preview.invalidCount}</b> invalid · <b className="text-warn">{preview.duplicateCount}</b> duplicate</p>
          {preview.invalid.length > 0 && <ul className="list-disc pl-5 text-danger">{preview.invalid.map((r) => <li key={r.row}>Row {r.row}: {r.error}</li>)}</ul>}
          {preview.duplicate.length > 0 && <ul className="list-disc pl-5 text-warn">{preview.duplicate.map((r) => <li key={r.row}>Row {r.row}: {r.phone} already exists</li>)}</ul>}
          <Button type="button" disabled={busy || preview.valid === 0} onClick={() => send(true)}>Import {preview.valid} valid row(s)</Button>
        </div>
      )}
    </div>
  );
}

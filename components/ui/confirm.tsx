"use client";
import { useRef } from "react";

/** Confirmation modal for dangerous actions (accessible <dialog>). */
export function ConfirmForm({ action, title, message, label, confirmLabel = "Confirm", danger = true, children }: {
  action: (fd: FormData) => void | Promise<void>; title: string; message: string; label: string; confirmLabel?: string; danger?: boolean; children?: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${danger ? "text-danger hover:bg-danger/10" : "hover:bg-surface2"}`}>{label}</button>
      <dialog ref={ref} aria-labelledby="cf-title" className="m-auto w-[min(92vw,26rem)] rounded-card border border-line bg-surface p-6 text-fg backdrop:bg-black/60">
        <form action={action}>
          {children}
          <h2 id="cf-title" className="text-lg font-bold">{title}</h2>
          <p className="mt-2 text-sm text-muted">{message}</p>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={() => ref.current?.close()} className="rounded-xl border border-line px-4 py-2 text-sm font-semibold hover:bg-surface2">Cancel</button>
            <button type="submit" className={`rounded-xl px-4 py-2 text-sm font-semibold text-white ${danger ? "bg-danger" : "bg-brand2"}`}>{confirmLabel}</button>
          </div>
        </form>
      </dialog>
    </>
  );
}

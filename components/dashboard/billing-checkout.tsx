"use client";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type PlanView = { code: string; name: string; priceLabel: string; custom: boolean; limits: string; current: boolean; action: string };
declare global { interface Window { Razorpay?: new (o: Record<string, unknown>) => { open(): void; on(e: string, cb: (r: { error?: { description?: string } }) => void): void } } }

function loadScript() {
  return new Promise<boolean>((res) => {
    if (window.Razorpay) return res(true);
    const s = document.createElement("script"); s.src = "https://checkout.razorpay.com/v1/checkout.js"; s.onload = () => res(true); s.onerror = () => res(false); document.body.appendChild(s);
  });
}

export function BillingCheckout({ plans, gymName, email }: { plans: PlanView[]; gymName: string; email: string }) {
  const [coupon, setCoupon] = useState(""); const [busy, setBusy] = useState(""); const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null);

  async function pay(planCode: string) {
    setBusy(planCode); setMsg(null);
    try {
      const r = await fetch("/api/billing/order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planCode, coupon: coupon || undefined }) });
      const order = await r.json();
      if (!r.ok) throw new Error(order.error ?? "Could not start payment.");
      if (!(await loadScript()) || !window.Razorpay) throw new Error("Could not load the payment window. Check your connection.");
      const rz = new window.Razorpay({
        key: order.keyId, amount: order.amount, currency: order.currency, order_id: order.orderId, name: "GymTrackey", description: `${order.planName} plan — 1 month`, prefill: { name: gymName, email },
        theme: { color: "#1e9bff" },
        handler: async (resp: Record<string, string>) => {
          const v = await fetch("/api/billing/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(resp) });
          const d = await v.json();
          if (v.ok) { setMsg({ ok: true, text: "Payment verified. Your plan is active!" }); setTimeout(() => location.reload(), 1200); }
          else setMsg({ text: d.error ?? "Verification failed." });
          setBusy("");
        },
        modal: { ondismiss: () => setBusy("") },
      });
      rz.on("payment.failed", (e) => { setMsg({ text: e.error?.description ?? "Payment failed. You were not charged." }); setBusy(""); });
      rz.open();
    } catch (e) { setMsg({ text: e instanceof Error ? e.message : "Something went wrong." }); setBusy(""); }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium" htmlFor="coupon">Coupon code</label>
        <input id="coupon" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="Optional" className="w-44 rounded-xl border border-line bg-surface2 px-3 py-2 text-sm outline-none focus:border-brand2" />
      </div>
      {msg && <p role={msg.ok ? "status" : "alert"} className={`mb-4 rounded-xl px-4 py-3 text-sm ${msg.ok ? "bg-brand/10 text-brand" : "bg-danger/10 text-danger"}`}>{msg.text}</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((p) => (
          <Card key={p.code} className={p.current ? "border-brand2" : ""}>
            <h3 className="font-bold">{p.name}</h3><p className="mt-2 text-2xl font-black">{p.priceLabel}</p><p className="mt-1 text-xs text-muted">{p.limits}</p>
            <div className="mt-4">{p.custom ? <ButtonLink href="/contact" variant="secondary" className="w-full">Contact sales</ButtonLink>
              : <Button className="w-full" variant={p.current ? "secondary" : "primary"} disabled={!!busy} onClick={() => pay(p.code)}>{busy === p.code ? "Opening…" : p.action}</Button>}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

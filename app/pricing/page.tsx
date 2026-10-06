import type { Metadata } from "next";
import { Check } from "lucide-react";
import { MarketingFooter, MarketingNav } from "@/components/marketing/nav";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { prisma } from "@/server/db/prisma";
import { DEFAULT_PLANS } from "@/server/services/plans";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Pricing", description: "Simple GymTrackey pricing from ₹499/month. Start a 14-day free trial." };
export const dynamic = "force-dynamic";

const COPY: Record<string, string[]> = {
  starter: ["Up to 100 members", "Member & membership management", "Fee tracking", "Attendance", "Receipts", "Basic reports"],
  growth: ["Up to 500 members", "Everything in Starter", "Trainer management", "Workout plans", "Diet plans", "Advanced reports", "WhatsApp-ready reminders"],
  professional: ["Unlimited members", "Multiple staff", "Multiple branches", "Advanced analytics", "Expense management", "Automated reminders", "Priority support"],
  enterprise: ["Custom limits", "For gym chains", "Dedicated onboarding", "API access", "Custom domain & branding"],
};

async function loadPlans() {
  try {
    const rows = await prisma.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
    if (rows.length) return rows.map((r) => ({ code: r.code, name: r.name, price: r.priceMonthly, custom: r.isCustom }));
  } catch { /* DB unavailable at build/preview time: fall back to defaults */ }
  return DEFAULT_PLANS.map((p) => ({ code: p.code, name: p.name, price: p.priceMonthly, custom: "isCustom" in p }));
}

export default async function Pricing() {
  const plans = await loadPlans();
  return (
    <>
      <MarketingNav />
      <main className="mx-auto max-w-6xl px-4 py-16">
        <h1 className="text-center text-4xl font-black sm:text-5xl">Simple, transparent pricing</h1>
        <p className="mx-auto mt-3 max-w-xl text-center text-muted">Start free for 14 days. Upgrade when your gym grows.</p>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((p) => (
            <Card key={p.code} className={p.code === "growth" ? "relative border-brand2 gt-glow" : ""}>
              {p.code === "growth" && <span className="gt-gradient-bg absolute -top-3 left-6 rounded-full px-3 py-0.5 text-xs font-bold text-black">Most popular</span>}
              <h2 className="text-lg font-bold">{p.name}</h2>
              <p className="mt-3 text-4xl font-black">{p.custom ? "Custom" : formatMoney(p.price)}{!p.custom && <span className="text-sm font-medium text-muted">/month</span>}</p>
              <ul className="mt-5 space-y-2 text-sm">
                {(COPY[p.code] ?? []).map((f) => <li key={f} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-brand" aria-hidden />{f}</li>)}
              </ul>
              <ButtonLink href={p.custom ? "/contact" : "/register"} variant={p.code === "growth" ? "primary" : "secondary"} className="mt-6 w-full">
                {p.custom ? "Contact sales" : "Start Free Trial"}
              </ButtonLink>
            </Card>
          ))}
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}

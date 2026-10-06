import { Activity, BarChart3, Bell, CalendarCheck, Dumbbell, FileText, Layers, Receipt, Salad, Users, Wallet, UserCog } from "lucide-react";
import { MarketingFooter, MarketingNav } from "@/components/marketing/nav";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const features = [
  [Users, "Member Management", "Profiles, photos, goals and history in one place."],
  [Wallet, "Fee Tracking", "Know who has paid, who is due and who is overdue."],
  [CalendarCheck, "Attendance", "Manual, member-ID or QR check-in with expiry checks."],
  [Layers, "Membership Management", "Flexible plans, freezes and one-click renewals."],
  [UserCog, "Trainer Management", "Assign members, track commissions and progress."],
  [Dumbbell, "Workout Plans", "Day-by-day plans with completion tracking."],
  [Salad, "Diet Plans", "Meal-by-meal plans with calories and macros."],
  [Activity, "Progress Tracking", "Measurements and photo timelines that motivate."],
  [BarChart3, "Reports", "Revenue, dues, churn, retention — export to CSV/PDF."],
  [Bell, "Automated Reminders", "WhatsApp, SMS and email before and after due dates."],
  [Receipt, "Digital Receipts", "Branded GST invoices and receipts in seconds."],
  [FileText, "Multi-Branch", "Run every location from one login."],
] as const;

const workouts = [
  { day: "Mon", name: "Push Day", detail: "Bench press · 4×8 · 60kg", pct: 100 },
  { day: "Wed", name: "Pull Day", detail: "Deadlift · 3×5 · 90kg", pct: 66 },
  { day: "Fri", name: "Leg Day", detail: "Squat · 5×5 · 80kg", pct: 20 },
];
const trainers = [["Arjun Rao", "Strength & Conditioning", "42 members"], ["Meera Nair", "Yoga & Mobility", "31 members"], ["Kabir Shah", "Fat Loss Coach", "38 members"]];

export default function Home() {
  return (
    <>
      <MarketingNav />
      <main>
        <section className="relative overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-40 mx-auto h-[500px] w-[900px] rounded-full bg-brand2/20 blur-[140px]" />
          <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-20 text-center">
            <p className="gt-rise mx-auto mb-5 w-fit rounded-full border border-line bg-surface px-4 py-1.5 text-xs font-semibold tracking-widest text-muted">GYM MANAGEMENT SOFTWARE FOR INDIA</p>
            <h1 className="gt-rise text-5xl font-black tracking-tight sm:text-7xl">GYM<span className="gt-gradient-text">TRACKEY</span></h1>
            <p className="gt-rise mt-4 text-xl font-semibold sm:text-2xl">Track Members. Manage Fees. <span className="gt-gradient-text">Grow Your Gym.</span></p>
            <p className="gt-rise mx-auto mt-5 max-w-2xl text-muted">Everything your gym needs to manage members, memberships, payments, attendance and daily operations — in one simple platform.</p>
            <div className="gt-rise mt-8 flex flex-wrap justify-center gap-3">
              <ButtonLink href="/register" className="px-7 py-3 text-base">Start Free Trial</ButtonLink>
              <ButtonLink href="/demo" variant="secondary" className="px-7 py-3 text-base">Book a Demo</ButtonLink>
            </div>
            <p className="mt-3 text-xs text-muted">14-day free trial · No credit card required</p>

            {/* Dashboard preview */}
            <div className="gt-glow mx-auto mt-14 max-w-4xl rounded-card border border-line bg-surface p-4 text-left sm:p-6" aria-label="Dashboard preview">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[["Active members", "248"], ["Collected", "₹1.82L"], ["Pending fees", "₹48,750"], ["Today's check-ins", "63"]].map(([l, v]) => (
                  <div key={l} className="rounded-xl bg-surface2 p-4"><p className="text-xs text-muted">{l}</p><p className="mt-1 text-2xl font-bold">{v}</p></div>
                ))}
              </div>
              <div className="mt-3 flex h-36 items-end gap-2 rounded-xl bg-surface2 p-4" role="img" aria-label="Monthly revenue chart">
                {[35, 48, 42, 60, 55, 72, 68, 85, 80, 95, 90, 100].map((h, i) => (
                  <div key={i} className="gt-gradient-bg flex-1 rounded-t-md opacity-90" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16" id="features">
          <h2 className="text-center text-3xl font-extrabold sm:text-4xl">Everything to run your gym</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(([Icon, t, d]) => (
              <Card key={t} className="transition hover:-translate-y-0.5 hover:border-brand2/50">
                <Icon className="text-brand" size={26} aria-hidden /><h3 className="mt-4 font-bold">{t}</h3><p className="mt-1.5 text-sm text-muted">{d}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-extrabold sm:text-4xl">Workout plans your members will actually follow</h2>
              <p className="mt-3 text-muted">Trainers build day-wise plans; members tick them off and watch their progress climb.</p>
              <div className="mt-6 space-y-3">
                {workouts.map((w) => (
                  <Card key={w.day} className="flex items-center gap-4 p-4">
                    <span className="gt-gradient-bg grid h-12 w-12 shrink-0 place-items-center rounded-xl text-sm font-black text-black">{w.day}</span>
                    <div className="min-w-0 flex-1"><p className="font-bold">{w.name}</p><p className="truncate text-sm text-muted">{w.detail}</p></div>
                    <span className="text-sm font-semibold text-brand">{w.pct}%</span>
                  </Card>
                ))}
              </div>
            </div>
            <Card className="self-center">
              <p className="text-sm font-semibold text-muted">Progress tracking · Rahul K.</p>
              <p className="mt-1 text-4xl font-black">−6.4 kg <span className="text-base font-semibold text-brand">in 12 weeks</span></p>
              <svg viewBox="0 0 300 100" className="mt-4 w-full" role="img" aria-label="Weight trending down">
                <defs><linearGradient id="l" x1="0" x2="1"><stop offset="0" stopColor="#3df09a" /><stop offset="1" stopColor="#1e9bff" /></linearGradient></defs>
                <polyline fill="none" stroke="url(#l)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" points="5,15 50,25 95,32 140,45 185,52 230,70 295,82" />
              </svg>
            </Card>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-3xl font-extrabold sm:text-4xl">Trainer profiles that build trust</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {trainers.map(([n, s, m]) => (
              <Card key={n} className="text-center">
                <div className="gt-gradient-bg mx-auto grid h-16 w-16 place-items-center rounded-full text-xl font-black text-black">{n!.split(" ").map((x) => x[0]).join("")}</div>
                <p className="mt-3 font-bold">{n}</p><p className="text-sm text-muted">{s}</p><p className="mt-1 text-xs font-semibold text-brand">{m}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-20 text-center">
          <div className="gt-gradient-bg rounded-card p-10 text-black">
            <h2 className="text-3xl font-black">Ready to grow your gym?</h2>
            <p className="mt-2 font-medium">Start your 14-day free trial today — set up in under 10 minutes.</p>
            <ButtonLink href="/register" variant="secondary" className="mt-6 border-0 bg-black px-8 text-white hover:bg-black/80">Start Free Trial</ButtonLink>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}

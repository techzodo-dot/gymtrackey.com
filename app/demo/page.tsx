import type { Metadata } from "next";
import { StaticPage } from "@/components/marketing/static-page";
import { PublicForm } from "@/components/marketing/public-form";

export const metadata: Metadata = { title: "Book a Demo" };

export default function Demo() {
  return (
    <StaticPage title="See GymTrackey in action">
      <div className="gt-gradient-bg rounded-card p-6 text-black"><h2 className="!mt-0 text-xl font-black !text-black">Explore the live demo</h2><p className="mt-1 font-medium !text-black">A fully populated gym — 50 members, payments, attendance, reports. Read-only, no sign-up needed.</p>
        <a href="/api/demo/enter" className="mt-4 inline-flex rounded-xl bg-black px-6 py-3 text-sm font-bold text-white hover:bg-black/80">Explore Demo →</a></div>
      <h2>Or book a personal demo</h2>
      <p>See GymTrackey in action. Tell us about your gym and we&apos;ll reach out within one business day.</p>
      <PublicForm endpoint="/api/leads" submit="Request demo" success="Thanks! We'll contact you shortly."
        fields={[
          { name: "name", label: "Your name", required: true }, { name: "gymName", label: "Gym name", required: true },
          { name: "phone", label: "Phone", type: "tel", required: true }, { name: "email", label: "Email", type: "email", required: true },
          { name: "memberCount", label: "Number of members" }, { name: "city", label: "City" }, { name: "message", label: "Message", textarea: true },
        ]} />
    </StaticPage>
  );
}

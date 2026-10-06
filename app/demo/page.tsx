import type { Metadata } from "next";
import { StaticPage } from "@/components/marketing/static-page";
import { PublicForm } from "@/components/marketing/public-form";

export const metadata: Metadata = { title: "Book a Demo" };

export default function Demo() {
  return (
    <StaticPage title="Book a demo">
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

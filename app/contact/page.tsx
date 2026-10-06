import type { Metadata } from "next";
import { StaticPage } from "@/components/marketing/static-page";
import { PublicForm } from "@/components/marketing/public-form";

export const metadata: Metadata = { title: "Contact" };

export default function Contact() {
  return (
    <StaticPage title="Contact us">
      <p>Questions about GymTrackey? Send us a message.</p>
      <PublicForm endpoint="/api/contact" submit="Send message" success="Thanks — we'll get back to you soon."
        fields={[
          { name: "name", label: "Name", required: true }, { name: "email", label: "Email", type: "email", required: true },
          { name: "phone", label: "Phone", type: "tel" }, { name: "subject", label: "Subject", required: true },
          { name: "message", label: "Message", textarea: true, required: true },
        ]} />
    </StaticPage>
  );
}

import type { Metadata } from "next";
import { StaticPage } from "@/components/marketing/static-page";

export const metadata: Metadata = { title: "Refund Policy" };

export default function Page() {
  return <StaticPage title="Refund Policy"><p>This policy is a placeholder and must be reviewed by legal counsel before launch.</p></StaticPage>;
}

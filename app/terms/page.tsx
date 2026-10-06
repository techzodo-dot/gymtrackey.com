import type { Metadata } from "next";
import { StaticPage } from "@/components/marketing/static-page";

export const metadata: Metadata = { title: "Terms of Service" };

export default function Page() {
  return <StaticPage title="Terms of Service"><p>These terms are a placeholder and must be reviewed by legal counsel before launch.</p></StaticPage>;
}

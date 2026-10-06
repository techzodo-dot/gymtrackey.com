import type { Metadata } from "next";
import { StaticPage } from "@/components/marketing/static-page";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function Page() {
  return <StaticPage title="Privacy Policy"><p>This policy is a placeholder and must be reviewed by legal counsel before launch. Each gym&apos;s data is isolated from every other gym.</p></StaticPage>;
}

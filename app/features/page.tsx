import type { Metadata } from "next";
import { StaticPage } from "@/components/marketing/static-page";

export const metadata: Metadata = { title: "Features" };

export default function Page() {
  return <StaticPage title="Features"><p>GymTrackey brings member management, fee tracking, attendance (manual, member ID and QR), memberships, trainers, workout and diet plans, progress tracking, reports, automated reminders, digital receipts and multi-branch management into one platform.</p></StaticPage>;
}

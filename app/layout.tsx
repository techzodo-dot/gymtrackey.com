import type { Metadata, Viewport } from "next";
import "./globals.css";

const url = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.gymtrackey.com";

export const metadata: Metadata = {
  metadataBase: new URL(url),
  title: { default: "GymTrackey — Gym Management Software | Track Members. Manage Fees. Grow Your Gym.", template: "%s | GymTrackey" },
  description:
    "GymTrackey is gym management software for India: manage members, memberships, fee tracking, attendance, trainers, receipts and reminders in one simple platform.",
  keywords: ["gym management software", "gym management system", "gym software India", "gym membership management software", "gym fee management software", "gym attendance software", "gym CRM", "gym billing software"],
  openGraph: { title: "GymTrackey — Track Members. Manage Fees. Grow Your Gym.", description: "Gym management software built for gym owners.", url, siteName: "GymTrackey", type: "website" },
  twitter: { card: "summary_large_image" },
};
export const viewport: Viewport = { themeColor: "#07090c", width: "device-width", initialScale: 1 };

// Applies the saved theme before paint to avoid a flash.
const themeScript = `try{var t=localStorage.getItem('gt-theme');if(t)document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body>{children}</body>
    </html>
  );
}

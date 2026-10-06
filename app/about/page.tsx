import type { Metadata } from "next";
import { StaticPage } from "@/components/marketing/static-page";

export const metadata: Metadata = { title: "About GymTrackey" };

export default function Page() {
  return <StaticPage title="About GymTrackey"><p>GymTrackey is built for gym owners who want to spend less time on spreadsheets and more time growing their business.</p></StaticPage>;
}

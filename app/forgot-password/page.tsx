import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { Card } from "@/components/ui/card";
import { SimpleForm } from "@/components/simple-form";

export const metadata: Metadata = { title: "Forgot password" };
export default function Forgot() {
  return <main className="grid min-h-dvh place-items-center px-4"><div className="w-full max-w-md"><div className="mb-6 flex justify-center"><Logo /></div><Card><h1 className="text-2xl font-bold">Reset your password</h1><p className="mb-6 mt-1 text-sm text-muted">Enter your email and we&apos;ll send a reset link.</p>
    <SimpleForm endpoint="/api/auth/forgot" fields={[{ name: "email", label: "Email", type: "email", autoComplete: "email" }]} submit="Send reset link" success="If that email has an account, a reset link is on its way." /></Card></div></main>;
}

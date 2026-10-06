import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { AuthForm } from "@/components/auth-form";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Start your free trial" };

export default function Register() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <Card>
          <h1 className="text-2xl font-bold">Start your 14-day free trial</h1>
          <p className="mb-6 mt-1 text-sm text-muted">No credit card required.</p>
          <AuthForm endpoint="/api/auth/register" submit="Create my gym"
            fields={[
              { name: "gymName", label: "Gym name" }, { name: "ownerName", label: "Owner name", autoComplete: "name" },
              { name: "email", label: "Email", type: "email", autoComplete: "email" }, { name: "phone", label: "Phone", type: "tel", autoComplete: "tel" },
              { name: "password", label: "Password (10+ chars, upper, lower, number)", type: "password", autoComplete: "new-password" },
              { name: "city", label: "City" }, { name: "state", label: "State" }, { name: "country", label: "Country" },
            ]} />
          <p className="mt-5 text-center text-sm text-muted">Already have an account? <Link href="/login" className="font-semibold text-brand">Log in</Link></p>
        </Card>
      </div>
    </main>
  );
}

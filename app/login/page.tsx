import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { AuthForm } from "@/components/auth-form";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Log in" };

export default function Login() {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <Card>
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="mb-6 mt-1 text-sm text-muted">Log in to manage your gym.</p>
          <Suspense>
            <AuthForm endpoint="/api/auth/login" submit="Log in" remember
              fields={[{ name: "email", label: "Email", type: "email", autoComplete: "email" }, { name: "password", label: "Password", type: "password", autoComplete: "current-password" }]} />
          </Suspense>
          <p className="mt-5 text-center text-sm text-muted">New to GymTrackey? <Link href="/register" className="font-semibold text-brand">Start your free trial</Link></p>
        </Card>
      </div>
    </main>
  );
}

import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { Card } from "@/components/ui/card";
import { SimpleForm } from "@/components/simple-form";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };
export default async function Reset({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <main className="grid min-h-dvh place-items-center px-4"><div className="w-full max-w-md"><div className="mb-6 flex justify-center"><Logo /></div><Card><h1 className="text-2xl font-bold">Choose a new password</h1>
    {token ? <div className="mt-6"><SimpleForm endpoint="/api/auth/reset" extra={{ token }} fields={[{ name: "password", label: "New password (10+ chars, upper, lower, number)", type: "password", autoComplete: "new-password" }]} submit="Update password" success="Password updated. Redirecting to login…" redirect="/login" /></div> : <p className="mt-2 text-sm text-danger">This link is missing its token. Request a new reset email.</p>}</Card></div></main>;
}

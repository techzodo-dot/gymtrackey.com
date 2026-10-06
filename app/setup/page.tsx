import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { Card } from "@/components/ui/card";
import { SimpleForm } from "@/components/simple-form";
import { prisma } from "@/server/db/prisma";

export const metadata: Metadata = { title: "Set up admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Setup() {
  const enabled = !!process.env.SETUP_TOKEN && process.env.SETUP_TOKEN.length >= 12;
  const done = enabled ? (await prisma.user.count({ where: { role: "SUPER_ADMIN" } }).catch(() => 0)) > 0 : false;
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <Card>
          <h1 className="text-2xl font-bold">Create the platform admin</h1>
          {!enabled ? (
            <p className="mt-3 text-sm text-muted">Setup is disabled. In your host&apos;s environment variables add <code>SETUP_TOKEN</code> (any secret of 12+ characters), redeploy, then reload this page.</p>
          ) : done ? (
            <p className="mt-3 text-sm text-muted">An admin already exists. <a className="text-brand underline" href="/login">Log in</a>. For safety you can now remove <code>SETUP_TOKEN</code>.</p>
          ) : (
            <>
              <p className="mb-6 mt-1 text-sm text-muted">One-time step. Enter your <code>SETUP_TOKEN</code> and choose the admin login.</p>
              <SimpleForm endpoint="/api/setup" submit="Create admin" success="Admin created. Redirecting to login…" redirect="/login"
                fields={[{ name: "token", label: "Setup token", type: "password" }, { name: "email", label: "Admin email", type: "email", autoComplete: "email" }, { name: "password", label: "Password (10+ chars, upper, lower, number)", type: "password", autoComplete: "new-password" }]} />
            </>
          )}
        </Card>
      </div>
    </main>
  );
}

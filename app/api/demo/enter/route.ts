import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, cookieOptions, signSession } from "@/server/auth/session";
import { ensureDemoTenant } from "@/server/services/demo";
import { clientIp, publicOrigin } from "@/server/api";
import { rateLimit } from "@/server/auth/rate-limit";

/** Starts a read-only session in the shared demo gym. No real customer data is reachable from it. */
export async function GET(req: Request) {
  if (!rateLimit(`demo:${clientIp(req)}`, 30, 60 * 60 * 1000).ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const owner = await ensureDemoTenant();
  const token = await signSession({ uid: owner.id, role: owner.role, tid: owner.tenantId }, 60 * 60 * 4);
  (await cookies()).set(SESSION_COOKIE, token, cookieOptions(60 * 60 * 4));
  return NextResponse.redirect(new URL("/dashboard", publicOrigin(req)), 303);
}

import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, readSession } from "@/server/auth/session";
import { homeFor } from "@/server/auth/permissions";

const AREAS: { prefix: string; roles: string[] }[] = [
  { prefix: "/admin", roles: ["SUPER_ADMIN"] },
  { prefix: "/dashboard", roles: ["OWNER", "MANAGER", "RECEPTIONIST", "TRAINER"] },
  { prefix: "/trainer", roles: ["TRAINER", "OWNER", "MANAGER"] },
  { prefix: "/member", roles: ["MEMBER"] },
];

/** Cheap edge gate. Real authorization is re-checked server-side in server/auth/guard.ts. */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const area = AREAS.find((a) => pathname === a.prefix || pathname.startsWith(`${a.prefix}/`));
  if (!area) return NextResponse.next();

  const session = await readSession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (!area.roles.includes(session.role)) {
    return NextResponse.redirect(new URL(homeFor(session.role), req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/dashboard/:path*", "/trainer/:path*", "/member/:path*"] };

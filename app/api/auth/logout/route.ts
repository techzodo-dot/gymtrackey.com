import { cookies } from "next/headers";
import { assertSameOrigin, handleError, json } from "@/server/api";
import { SESSION_COOKIE } from "@/server/auth/session";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    (await cookies()).delete(SESSION_COOKIE);
    return json({ ok: true, redirect: "/login" });
  } catch (err) {
    return handleError(err);
  }
}

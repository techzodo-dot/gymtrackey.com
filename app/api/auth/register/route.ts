import { cookies } from "next/headers";
import { registerSchema } from "@/lib/validation";
import { assertSameOrigin, clientIp, fail, handleError, json, parseBody } from "@/server/api";
import { rateLimit } from "@/server/auth/rate-limit";
import { SESSION_COOKIE, cookieOptions, signSession } from "@/server/auth/session";
import { EmailTakenError, registerGym } from "@/server/services/registration";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const rl = rateLimit(`register:${clientIp(req)}`, 5, 60 * 60 * 1000);
    if (!rl.ok) return fail("Too many sign-ups from this network. Try again later.", 429, { retryAfter: rl.retryAfter });

    const input = await parseBody(req, registerSchema);
    const { tenant, owner } = await registerGym(input);

    const token = await signSession({ uid: owner.id, role: owner.role, tid: tenant.id });
    (await cookies()).set(SESSION_COOKIE, token, cookieOptions(60 * 60 * 24 * 7));
    logger.info("auth.register", { tenantId: tenant.id });
    return json({ ok: true, redirect: "/dashboard" }, 201);
  } catch (err) {
    if (err instanceof EmailTakenError) return fail(err.message, 409);
    return handleError(err);
  }
}

import { cookies } from "next/headers";
import { loginSchema } from "@/lib/validation";
import { assertSameOrigin, clientIp, fail, handleError, json, parseBody } from "@/server/api";
import { prisma } from "@/server/db/prisma";
import { dummyHash, verifyPassword } from "@/server/auth/password";
import { homeFor } from "@/server/auth/permissions";
import { rateLimit } from "@/server/auth/rate-limit";
import { REMEMBER_TTL, SESSION_COOKIE, cookieOptions, signSession } from "@/server/auth/session";
import { audit } from "@/server/services/audit";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const ip = clientIp(req);
    const input = await parseBody(req, loginSchema);

    const rl = rateLimit(`login:${ip}:${input.email}`, 8, 15 * 60 * 1000);
    if (!rl.ok) return fail("Too many attempts. Try again in a few minutes.", 429, { retryAfter: rl.retryAfter });

    const user = await prisma.user.findUnique({ where: { email: input.email } });
    const valid = await verifyPassword(input.password, user?.passwordHash ?? (await dummyHash()));
    if (!user || !valid || !user.isActive) {
      logger.warn("auth.login_failed", { ip });
      return fail("Incorrect email or password.", 401);
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const ttl = input.remember ? REMEMBER_TTL : 60 * 60 * 24 * 7;
    const token = await signSession({ uid: user.id, role: user.role, tid: user.tenantId }, ttl);
    (await cookies()).set(SESSION_COOKIE, token, cookieOptions(ttl));
    await audit({ tenantId: user.tenantId, userId: user.id, action: "auth.login", ip });
    return json({ ok: true, redirect: homeFor(user.role) });
  } catch (err) {
    return handleError(err);
  }
}

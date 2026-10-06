import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { assertSameOrigin, clientIp, fail, handleError, json, parseBody } from "@/server/api";
import { rateLimit } from "@/server/auth/rate-limit";
import { hashPassword } from "@/server/auth/password";
import { emailSchema, passwordSchema } from "@/lib/validation";
import { ensurePlans } from "@/server/services/plans";
import { audit } from "@/server/services/audit";

const schema = z.object({ token: z.string().min(1).max(200), email: emailSchema, password: passwordSchema });

const safeEq = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };

/**
 * One-time bootstrap of the FIRST Super Admin from the browser.
 * Disabled unless SETUP_TOKEN is set, requires that token, and refuses once any Super Admin exists.
 */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const setupToken = process.env.SETUP_TOKEN;
    if (!setupToken || setupToken.length < 12) return fail("Setup is disabled. Set a SETUP_TOKEN (12+ characters) in the server environment and redeploy.", 404);
    if (!rateLimit(`setup:${clientIp(req)}`, 10, 15 * 60 * 1000).ok) return fail("Too many attempts. Try again later.", 429);

    const body = await parseBody(req, schema);
    if (!safeEq(body.token, setupToken)) return fail("Invalid setup token.", 403);
    if (await prisma.user.count({ where: { role: "SUPER_ADMIN" } })) return fail("Setup is already complete. Log in at /login.", 403);
    if (await prisma.user.findUnique({ where: { email: body.email }, select: { id: true } })) return fail("That email is already used by another account.", 409);

    await ensurePlans();
    const admin = await prisma.user.create({ data: { email: body.email, name: "Platform Admin", role: "SUPER_ADMIN", passwordHash: await hashPassword(body.password), emailVerified: true } });
    await audit({ userId: admin.id, action: "admin.bootstrap", ip: clientIp(req) });
    return json({ ok: true }, 201);
  } catch (e) { return handleError(e); }
}

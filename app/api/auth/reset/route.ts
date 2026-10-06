import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { assertSameOrigin, fail, handleError, json, parseBody } from "@/server/api";
import { hashPassword, hashToken } from "@/server/auth/password";
import { passwordSchema } from "@/lib/validation";
import { audit } from "@/server/services/audit";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const { token, password } = await parseBody(req, z.object({ token: z.string().min(20).max(200), password: passwordSchema }));
    const rec = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
    if (!rec || rec.usedAt || rec.expiresAt < new Date()) return fail("This reset link is invalid or has expired. Request a new one.", 400);
    // One-time use: claim the token atomically before changing the password.
    const claimed = await prisma.passwordResetToken.updateMany({ where: { id: rec.id, usedAt: null }, data: { usedAt: new Date() } });
    if (claimed.count !== 1) return fail("This reset link has already been used.", 400);
    const user = await prisma.user.update({ where: { id: rec.userId }, data: { passwordHash: await hashPassword(password) } });
    await audit({ tenantId: user.tenantId, userId: user.id, action: "auth.password_reset" });
    return json({ ok: true });
  } catch (e) { return handleError(e); }
}

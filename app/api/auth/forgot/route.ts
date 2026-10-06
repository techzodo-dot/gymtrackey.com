import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { assertSameOrigin, clientIp, fail, handleError, json, parseBody } from "@/server/api";
import { rateLimit } from "@/server/auth/rate-limit";
import { newResetToken } from "@/server/auth/password";
import { providerFor } from "@/server/services/messaging";
import { emailSchema } from "@/lib/validation";
import { logger } from "@/lib/logger";

/** Always answers the same way so account existence isn't revealed. */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    if (!rateLimit(`forgot:${clientIp(req)}`, 5, 60 * 60 * 1000).ok) return fail("Too many requests. Try again later.", 429);
    const { email } = await parseBody(req, z.object({ email: emailSchema }));
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && user.isActive) {
      const { raw, hash } = newResetToken();
      await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: hash, expiresAt: new Date(Date.now() + 30 * 60_000) } });
      const link = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/reset-password?token=${raw}`;
      const mail = providerFor("EMAIL");
      if (mail.configured()) await mail.send(user.email, `Reset your GymTrackey password (valid 30 minutes, single use):\n\n${link}`, "Reset your password");
      else if (process.env.NODE_ENV !== "production") logger.info("auth.reset_link_dev", { link }); // dev only; never in production
      else logger.error("auth.reset_email_not_configured");
    }
    return json({ ok: true });
  } catch (e) { return handleError(e); }
}

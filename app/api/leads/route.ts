import { leadSchema } from "@/lib/validation";
import { assertSameOrigin, clientIp, fail, handleError, json, parseBody } from "@/server/api";
import { prisma } from "@/server/db/prisma";
import { rateLimit } from "@/server/auth/rate-limit";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    if (!rateLimit(`lead:${clientIp(req)}`, 5, 60 * 60 * 1000).ok) return fail("Too many requests. Try again later.", 429);
    const data = await parseBody(req, leadSchema);
    await prisma.lead.create({ data });
    return json({ ok: true }, 201);
  } catch (err) {
    return handleError(err);
  }
}

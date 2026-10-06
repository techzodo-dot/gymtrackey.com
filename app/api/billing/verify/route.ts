import { z } from "zod";
import { assertSameOrigin, handleError, json, parseBody } from "@/server/api";
import { requirePermission } from "@/server/auth/guard";
import { verifyAndActivate } from "@/server/services/billing";
import { DomainError } from "@/server/errors";

const schema = z.object({ razorpay_order_id: z.string(), razorpay_payment_id: z.string(), razorpay_signature: z.string() });

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const ctx = await requirePermission("billing");
    const b = await parseBody(req, schema);
    await verifyAndActivate(ctx.tenant.id, b.razorpay_order_id, b.razorpay_payment_id, b.razorpay_signature);
    return json({ ok: true });
  } catch (e) {
    if (e instanceof DomainError) return json({ error: e.message }, 400);
    return handleError(e);
  }
}

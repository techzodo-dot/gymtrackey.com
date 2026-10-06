import { z } from "zod";
import { assertSameOrigin, handleError, json, parseBody } from "@/server/api";
import { requirePermission } from "@/server/auth/guard";
import { createCheckoutOrder } from "@/server/services/billing";
import { DomainError } from "@/server/errors";

const schema = z.object({ planCode: z.string().min(1), coupon: z.string().optional() });

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const ctx = await requirePermission("billing"); // reading allowed even when expired — renewing must work
    if (ctx.tenant.isDemo) throw new DomainError("Billing is disabled in the demo.");
    const { planCode, coupon } = await parseBody(req, schema);
    return json(await createCheckoutOrder(ctx.tenant.id, planCode, coupon || undefined));
  } catch (e) {
    if (e instanceof DomainError) return json({ error: e.message }, 400);
    return handleError(e);
  }
}

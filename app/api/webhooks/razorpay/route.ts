import { NextResponse } from "next/server";
import { processWebhook, verifyWebhookSignature } from "@/server/services/billing";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  const raw = await req.text(); // raw body is required for signature verification
  const sig = req.headers.get("x-razorpay-signature") ?? "";
  if (!verifyWebhookSignature(raw, sig)) {
    logger.warn("razorpay.webhook_bad_signature");
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }
  const eventId = req.headers.get("x-razorpay-event-id");
  if (!eventId) return NextResponse.json({ error: "missing event id" }, { status: 400 });
  try {
    const res = await processWebhook(eventId, JSON.parse(raw));
    return NextResponse.json({ ok: true, ...res });
  } catch (e) {
    logger.error("razorpay.webhook_failed", { err: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ error: "processing failed" }, { status: 500 }); // Razorpay will retry
  }
}

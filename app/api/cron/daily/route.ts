import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runDailyJobs } from "@/server/services/jobs";

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer /, "");
  const ok = !!secret && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await runDailyJobs());
}
// Vercel Cron issues GET; support it with the same bearer check.
export const GET = POST;

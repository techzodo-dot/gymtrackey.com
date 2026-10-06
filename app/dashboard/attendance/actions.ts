"use server";
import { act, str } from "@/server/actions";
import { actionAuth } from "@/server/auth/page";
import { checkIn } from "@/server/services/attendance";
import { fullName } from "@/lib/format";

export async function checkInAction(fd: FormData) {
  return act("/dashboard/attendance", async () => {
    const ctx = await actionAuth("attendance", "attendance");
    const r = await checkIn(ctx.db, ctx.tenant.id, str(fd, "identifier"), str(fd, "method") === "QR" ? "QR" : "MEMBER_ID");
    return `/dashboard/attendance?ok=${encodeURIComponent(r.duplicate ? `${fullName(r.member)} was already checked in.` : `✓ ${fullName(r.member)} checked in.`)}`;
  });
}

import { prisma } from "@/server/db/prisma";
import { tenantDb } from "@/server/db/tenant";
import { startOfDay } from "@/lib/format";
import { logger } from "@/lib/logger";
import { runReminderEngine } from "./reminders";

/**
 * Daily automation (call from a cron: POST /api/cron/daily with Bearer CRON_SECRET).
 * Idempotent — safe to run more than once a day.
 */
export async function runDailyJobs(now = new Date()) {
  const today = startOfDay(now);
  const out = { expiredMemberships: 0, activatedPending: 0, unfrozen: 0, trialsExpired: 0, subscriptionsExpired: 0, reminders: 0 };

  // Trial / subscription expiry (platform level)
  out.trialsExpired = (await prisma.tenant.updateMany({ where: { status: "TRIAL", trialEndsAt: { lt: now }, isDemo: false }, data: { status: "EXPIRED" } })).count;
  const lapsed = await prisma.subscription.findMany({ where: { status: { in: ["ACTIVE", "CANCELLED"] }, renewsAt: { lt: now } }, select: { id: true, tenantId: true } });
  for (const s of lapsed) {
    await prisma.subscription.update({ where: { id: s.id }, data: { status: "EXPIRED" } });
    await prisma.tenant.updateMany({ where: { id: s.tenantId, status: { in: ["ACTIVE", "CANCELLED", "PAST_DUE"] } }, data: { status: "EXPIRED" } });
    out.subscriptionsExpired++;
  }

  // Per-tenant membership lifecycle + reminders
  const tenants = await prisma.tenant.findMany({ where: { status: { in: ["TRIAL", "ACTIVE", "PAST_DUE"] }, deletedAt: null, isDemo: false }, select: { id: true } });
  for (const t of tenants) {
    try {
      const db = tenantDb(t.id);
      const exp = await db.memberMembership.findMany({ where: { status: "ACTIVE", endDate: { lt: today } }, select: { id: true, memberId: true } });
      for (const m of exp) {
        await db.memberMembership.update({ where: { id: m.id }, data: { status: "EXPIRED" } });
        const stillActive = await db.memberMembership.count({ where: { memberId: m.memberId, status: { in: ["ACTIVE", "FROZEN", "PENDING"] }, endDate: { gte: today } } });
        if (!stillActive) await db.member.updateMany({ where: { id: m.memberId, status: "ACTIVE" }, data: { status: "EXPIRED" } });
      }
      out.expiredMemberships += exp.length;
      out.activatedPending += (await db.memberMembership.updateMany({ where: { status: "PENDING", startDate: { lte: today }, endDate: { gte: today } }, data: { status: "ACTIVE" } })).count;
      out.unfrozen += (await db.memberMembership.updateMany({ where: { status: "FROZEN", frozenTo: { lt: today } }, data: { status: "ACTIVE" } })).count;
      out.reminders += await runReminderEngine(db, t.id, now);
    } catch (e) {
      logger.error("jobs.tenant_failed", { tenantId: t.id, err: e instanceof Error ? e.message : String(e) });
    }
  }
  logger.info("jobs.daily_done", out);
  return out;
}

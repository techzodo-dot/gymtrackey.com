import { prisma } from "@/server/db/prisma";

/** Prices are in minor units (paise). Editable by Super Admin; these are first-run defaults. */
export const DEFAULT_PLANS = [
  { code: "starter", name: "Starter", priceMonthly: 49900, memberLimit: 100, branchLimit: 1, staffLimit: 3, sortOrder: 1,
    features: { attendance: true, trainers: false, diet: false, progressPhotos: false, multiBranch: false, whatsapp: false, reports: "basic", apiAccess: false, customBranding: false } },
  { code: "growth", name: "Growth", priceMonthly: 99900, memberLimit: 500, branchLimit: 1, staffLimit: 10, sortOrder: 2,
    features: { attendance: true, trainers: true, diet: true, progressPhotos: true, multiBranch: false, whatsapp: true, reports: "advanced", apiAccess: false, customBranding: false } },
  { code: "professional", name: "Professional", priceMonthly: 199900, memberLimit: null, branchLimit: 5, staffLimit: null, sortOrder: 3,
    features: { attendance: true, trainers: true, diet: true, progressPhotos: true, multiBranch: true, whatsapp: true, reports: "advanced", apiAccess: false, customBranding: true } },
  { code: "enterprise", name: "Enterprise", priceMonthly: 0, memberLimit: null, branchLimit: null, staffLimit: null, sortOrder: 4, isCustom: true,
    features: { attendance: true, trainers: true, diet: true, progressPhotos: true, multiBranch: true, whatsapp: true, reports: "advanced", apiAccess: true, customBranding: true } },
] as const;

export const DEFAULT_TRIAL_DAYS = 14;

/** Idempotently create default plans (never overwrites prices an admin has edited). */
export async function ensurePlans() {
  for (const p of DEFAULT_PLANS) {
    await prisma.subscriptionPlan.upsert({
      where: { code: p.code },
      update: {},
      create: { ...p, features: p.features, isCustom: "isCustom" in p ? p.isCustom : false },
    });
  }
}

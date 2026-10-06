import { randomBytes } from "node:crypto";
import { prisma } from "@/server/db/prisma";
import { registerGym } from "./registration";
import { loadSampleData } from "./sample-data";

export const DEMO_EMAIL = "demo@gymtrackey.com";

/** Creates (once) the public read-only demo gym with sample data. Credentials are random and never shown. */
export async function ensureDemoTenant() {
  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (existing) return existing;
  const { tenant, owner } = await registerGym({
    gymName: "GymTrackey Demo Fitness", ownerName: "Demo Owner", email: DEMO_EMAIL, phone: "+91 90000 00000",
    password: `${randomBytes(12).toString("base64url")}aA1`, city: "Bangalore", state: "Karnataka", country: "India",
  });
  await prisma.tenant.update({ where: { id: tenant.id }, data: { isDemo: true, status: "ACTIVE", planCode: "professional", trialEndsAt: null } });
  await loadSampleData(tenant.id);
  return owner;
}

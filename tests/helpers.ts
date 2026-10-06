process.env.AUTH_SECRET ??= "test-secret-test-secret-test-secret-123";
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://postgres@localhost:5433/gymtrackey_test?host=/tmp";

import { prisma } from "@/server/db/prisma";
import { registerGym } from "@/server/services/registration";

let n = 0;
export async function makeGym(label: string) {
  n += 1;
  const email = `${label.toLowerCase()}-${Date.now()}-${n}@example.com`;
  const res = await registerGym({
    gymName: `Gym ${label}`, ownerName: `Owner ${label}`, email, phone: "+91 98765 43210",
    password: "Str0ngPassword!", city: "Bangalore", state: "Karnataka", country: "India",
  });
  return { ...res, email };
}

export async function addMember(tenantId: string, first: string) {
  return prisma.member.create({
    data: { tenantId, firstName: first, phone: "9999999999", memberCode: `M-${Math.random().toString(36).slice(2, 8)}` },
  });
}
export { prisma };

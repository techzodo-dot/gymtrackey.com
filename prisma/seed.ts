import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../server/auth/password";
import { ensurePlans } from "../server/services/plans";
import { registerGym } from "../server/services/registration";

const prisma = new PrismaClient();

async function main() {
  await ensurePlans();

  // Super admin comes from the environment — never hard-coded.
  const email = process.env.SUPER_ADMIN_EMAIL?.toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD;
  if (email && password) {
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, name: "Platform Admin", passwordHash: await hashPassword(password), role: "SUPER_ADMIN", emailVerified: true },
    });
    console.log(`Super admin ready: ${email}`);
  } else {
    console.log("SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD not set — skipping super admin.");
  }

  if (process.env.SEED_DEMO === "true") {
    const demoEmail = "demo@gymtrackey.com";
    if (!(await prisma.user.findUnique({ where: { email: demoEmail } }))) {
      const { tenant } = await registerGym({
        gymName: "GymTrackey Demo Fitness", ownerName: "Demo Owner", email: demoEmail, phone: "+91 90000 00000",
        password: process.env.DEMO_PASSWORD ?? "DemoPassword123", city: "Bangalore", state: "Karnataka", country: "India",
      });
      const plans = await Promise.all(
        [["Monthly", 30, 100000], ["Quarterly", 90, 270000], ["Half Yearly", 180, 500000], ["Annual", 365, 900000]].map(([name, d, price]) =>
          prisma.membershipPlan.create({ data: { tenantId: tenant.id, name: name as string, durationDays: d as number, price: price as number } })),
      );
      const first = ["Rahul", "Priya", "Arjun", "Sneha", "Vikram", "Anita", "Rohan", "Divya", "Karan", "Neha"];
      for (let i = 0; i < 50; i++) {
        const plan = plans[i % plans.length]!;
        const start = new Date(Date.now() - (i % 40) * 86_400_000);
        const end = new Date(start.getTime() + plan.durationDays * 86_400_000);
        const m = await prisma.member.create({
          data: { tenantId: tenant.id, memberCode: `GT-M-${String(i + 1).padStart(4, "0")}`, firstName: first[i % first.length]!, lastName: `Demo${i + 1}`, phone: `90000${String(10000 + i)}`, status: end > new Date() ? "ACTIVE" : "EXPIRED" },
        });
        const ms = await prisma.memberMembership.create({ data: { tenantId: tenant.id, memberId: m.id, planId: plan.id, startDate: start, endDate: end, price: plan.price, status: end > new Date() ? "ACTIVE" : "EXPIRED" } });
        await prisma.payment.create({ data: { tenantId: tenant.id, memberId: m.id, membershipId: ms.id, amount: plan.price, finalAmount: plan.price, method: "UPI", paidAt: start } });
        if (i % 2 === 0) await prisma.attendance.create({ data: { tenantId: tenant.id, memberId: m.id } });
      }
      for (const [n, s] of [["Arjun Rao", "Strength"], ["Meera Nair", "Yoga"], ["Kabir Shah", "Fat loss"], ["Isha Verma", "CrossFit"], ["Dev Patel", "Mobility"]] as const) {
        await prisma.trainer.create({ data: { tenantId: tenant.id, name: n, specialization: s } });
      }
      console.log("Demo tenant seeded: demo@gymtrackey.com");
    }
  }
}

main().finally(() => prisma.$disconnect());

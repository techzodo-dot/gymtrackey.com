import { prisma } from "@/server/db/prisma";
import { addDays, startOfDay } from "@/lib/format";
import { calcBmi } from "./ops";
import { formatInvoiceNumber } from "./payments";

// Deterministic PRNG so the demo looks the same every time.
function rng(seed: number) { return () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296); }

const FIRST = ["Rahul", "Priya", "Arjun", "Sneha", "Vikram", "Anita", "Rohan", "Divya", "Karan", "Neha", "Aditya", "Pooja", "Manish", "Kavya", "Suresh", "Ritu", "Nikhil", "Isha", "Varun", "Meera", "Sandeep", "Tanvi", "Harsh", "Lakshmi", "Deepak"];
const LAST = ["Kumar", "Sharma", "Reddy", "Nair", "Patel", "Iyer", "Gupta", "Singh", "Rao", "Shetty"];
const EX: Record<string, [string, number, number, number][]> = {
  MONDAY: [["Bench Press", 4, 8, 60], ["Incline Dumbbell Press", 3, 10, 22], ["Triceps Pushdown", 3, 12, 25]],
  TUESDAY: [["Deadlift", 3, 5, 90], ["Lat Pulldown", 4, 10, 45], ["Barbell Row", 3, 8, 50]],
  WEDNESDAY: [["Squat", 5, 5, 80], ["Leg Press", 3, 12, 120], ["Calf Raise", 4, 15, 40]],
  THURSDAY: [["Overhead Press", 4, 8, 35], ["Lateral Raise", 3, 15, 8], ["Face Pull", 3, 15, 20]],
  FRIDAY: [["Barbell Curl", 3, 10, 25], ["Hammer Curl", 3, 12, 14], ["Plank", 3, 60, 0]],
};

/** Populates a tenant with realistic data: 50 members, 5 trainers, 4 plans, 6 months of payments, attendance, expenses, plans. */
export async function loadSampleData(tenantId: string, opts: { members?: number } = {}) {
  const r = rng(42);
  const pick = <T,>(a: readonly T[]) => a[Math.floor(r() * a.length)]!;
  const today = startOfDay();
  const N = opts.members ?? 50;
  const gym = await prisma.gym.findUniqueOrThrow({ where: { tenantId } });
  const branch = await prisma.branch.findFirstOrThrow({ where: { tenantId, isDefault: true } });
  const owner = await prisma.user.findFirstOrThrow({ where: { tenantId, role: "OWNER" } });

  await prisma.gym.update({ where: { tenantId }, data: { address: "12, MG Road, Indiranagar", gstin: "29ABCDE1234F1Z5" } });
  await prisma.setting.upsert({ where: { tenantId_key: { tenantId, key: "tax" } }, update: { value: { gstEnabled: true, gstPct: 18, interState: false } }, create: { tenantId, key: "tax", value: { gstEnabled: true, gstPct: 18, interState: false } } });

  const plans = await Promise.all([["Monthly", 30, 1200, 5, false], ["Quarterly", 90, 3200, 10, false], ["Half Yearly", 180, 5800, 15, false], ["Annual", 365, 10000, 30, true]]
    .map(([name, d, price, freeze, pt]) => prisma.membershipPlan.create({ data: { tenantId, name: name as string, durationDays: d as number, price: (price as number) * 100, freezeDays: freeze as number, trainerIncluded: pt as boolean, description: `${name} access to all gym floors` } })));

  const trainers = await Promise.all([["Arjun Rao", "Strength & Conditioning", 12], ["Meera Nair", "Yoga & Mobility", 10], ["Kabir Shah", "Fat Loss Coach", 15], ["Isha Verma", "CrossFit", 12], ["Dev Patel", "Powerlifting", 10]]
    .map(([name, spec, pct]) => prisma.trainer.create({ data: { tenantId, branchId: branch.id, name: name as string, specialization: spec as string, commissionPct: pct as number, salary: 2500000, joinedAt: addDays(today, -300), phone: `98450${Math.floor(10000 + r() * 89999)}` } })));

  let invSeq = 0;
  const year = today.getFullYear();
  const members = [];
  for (let i = 0; i < N; i++) {
    const plan = plans[Math.floor(r() * 3.4)]!;
    const joinedDaysAgo = Math.floor(r() * 170);
    const start = addDays(today, -Math.min(joinedDaysAgo, Math.floor(r() * (plan.durationDays + 20))));
    const end = addDays(start, plan.durationDays - 1);
    const active = end >= today;
    const gender = r() < 0.6 ? "MALE" as const : "FEMALE" as const;
    const dob = new Date(Date.UTC(1975 + Math.floor(r() * 32), Math.floor(r() * 12), 1 + Math.floor(r() * 28)));
    if (i < 3) { dob.setUTCFullYear(1995); dob.setUTCMonth(today.getMonth()); dob.setUTCDate(Math.min(28, today.getDate() + i)); } // birthdays near today
    const height = 150 + Math.floor(r() * 35), weight = 50 + Math.floor(r() * 45);
    const m = await prisma.member.create({ data: {
      tenantId, branchId: branch.id, memberCode: `GT-M-${String(i + 1).padStart(4, "0")}`, firstName: FIRST[i % FIRST.length]!, lastName: pick(LAST),
      gender, dob, phone: `9${String(800000000 + i * 7919).padStart(9, "0")}`, email: `member${i + 1}@example.com`, joinDate: addDays(today, -joinedDaysAgo),
      status: active ? "ACTIVE" : "EXPIRED", trainerId: r() < 0.7 ? pick(trainers).id : null, heightCm: height, weightKg: weight,
      fitnessGoals: pick(["Fat loss", "Muscle gain", "General fitness", "Strength", "Stamina"]), bloodGroup: pick(["A+", "B+", "O+", "AB+", "O-"]),
    } });
    members.push(m);
    const ms = await prisma.memberMembership.create({ data: { tenantId, memberId: m.id, planId: plan.id, startDate: start, endDate: end, status: active ? "ACTIVE" : "EXPIRED", price: plan.price } });
    const paidPending = r() < 0.12;
    const amount = plan.price, tax = Math.round(amount * 0.18), total = amount + tax;
    if (paidPending) {
      await prisma.payment.create({ data: { tenantId, branchId: branch.id, memberId: m.id, membershipId: ms.id, amount, tax, finalAmount: total, method: "UPI", status: "PENDING", dueDate: addDays(today, Math.floor(r() * 10) - 3), collectedById: owner.id, createdAt: start } });
    } else {
      const p = await prisma.payment.create({ data: { tenantId, branchId: branch.id, memberId: m.id, membershipId: ms.id, amount, tax, finalAmount: total, method: pick(["UPI", "CASH", "CARD", "UPI"] as const), status: "PAID", paidAt: start, collectedById: owner.id, createdAt: start } });
      invSeq++;
      await prisma.invoice.create({ data: { tenantId, memberId: m.id, paymentId: p.id, number: formatInvoiceNumber(gym.invoicePrefix, year, invSeq), subtotal: amount, cgst: tax >> 1, sgst: tax - (tax >> 1), total, issuedAt: start } });
    }
    // Attendance: active members visit most days over the last 30 days
    if (active) {
      const rows = [];
      for (let d = 0; d < 30; d++) if (r() < 0.45) rows.push({ tenantId, branchId: branch.id, memberId: m.id, checkInAt: new Date(addDays(today, -d).getTime() + (5 + Math.floor(r() * 16)) * 3600_000), method: "MANUAL" as const });
      if (rows.length) await prisma.attendance.createMany({ data: rows });
    }
    // Measurements for the first 12 members (monthly, improving)
    if (i < 12) for (let k = 0; k < 4; k++) await prisma.measurement.create({ data: { tenantId, memberId: m.id, measuredAt: addDays(today, -30 * (3 - k)), weightKg: weight - k * 1.2, heightCm: height, bmi: calcBmi(weight - k * 1.2, height), waistCm: 86 - k, chestCm: 98 + k * 0.5, bodyFatPct: 24 - k * 0.8 } });
  }

  // Workout + diet plans for the first 8 members
  for (const m of members.slice(0, 8)) {
    await prisma.workoutPlan.create({ data: { tenantId, memberId: m.id, trainerId: m.trainerId, name: "Push / Pull / Legs", startDate: addDays(today, -14), endDate: addDays(today, 42),
      exercises: { create: Object.entries(EX).flatMap(([day, list]) => list.map(([exercise, sets, reps, w], n) => ({ tenantId, day: day as never, exercise, sets, reps, weightKg: w, restSec: 90, sortOrder: n, completed: r() < 0.4 }))) } } });
    await prisma.dietPlan.create({ data: { tenantId, memberId: m.id, trainerId: m.trainerId, name: "High-protein plan", notes: "Drink 3L water daily.",
      meals: { create: [["BREAKFAST", "Oats with banana & whey", "1 bowl", 420, 32, 55, 8], ["MID_MORNING", "Sprouts & buttermilk", "1 cup", 180, 12, 22, 4], ["LUNCH", "Chicken, rice, dal, salad", "1 plate", 650, 45, 70, 18], ["EVENING", "Peanut butter toast", "2 slices", 300, 14, 30, 14], ["DINNER", "Paneer, roti, vegetables", "1 plate", 520, 30, 48, 20], ["BEFORE_BED", "Milk with turmeric", "1 glass", 150, 8, 12, 6]]
        .map(([mealTime, food, quantity, calories, p, c, f]) => ({ tenantId, mealTime: mealTime as never, food: food as string, quantity: quantity as string, calories: calories as number, proteinG: p as number, carbsG: c as number, fatsG: f as number })) } } });
  }

  // Expenses across six months
  const cats = [["RENT", 9000], ["ELECTRICITY", 2200], ["SALARY", 12000], ["INTERNET", 800], ["CLEANING", 1500], ["MAINTENANCE", 1200], ["MARKETING", 1500], ["EQUIPMENT", 2500]] as const;
  for (let mo = 0; mo < 6; mo++) for (const [c, base] of cats) if (c === "RENT" || c === "SALARY" || c === "ELECTRICITY" || r() < 0.6)
    await prisma.expense.create({ data: { tenantId, category: c, amount: Math.round(base * (0.9 + r() * 0.2)) * 100, date: new Date(today.getFullYear(), today.getMonth() - mo, 1 + Math.floor(r() * 25)), method: pick(["BANK_TRANSFER", "UPI", "CASH"] as const), vendor: pick(["Prime Fitness Equip", "City Power", "BSNL", "Local vendor"]), addedById: owner.id } });

  await prisma.announcement.create({ data: { tenantId, title: "New Zumba class starts Monday", body: "Join us at 7 AM every Monday and Wednesday. Free for all members.", createdById: owner.id } });
  const some = members.slice(0, 5);
  await prisma.notification.createMany({ data: some.map((m) => ({ tenantId, memberId: m.id, type: "ANNOUNCEMENT" as const, title: "New Zumba class starts Monday", body: "Join us at 7 AM every Monday and Wednesday." })) });
  return { members: members.length, trainers: trainers.length, plans: plans.length };
}

export async function hasSampleData(tenantId: string) {
  return (await prisma.member.count({ where: { tenantId } })) > 0;
}

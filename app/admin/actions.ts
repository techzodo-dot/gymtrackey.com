"use server";
import { revalidatePath } from "next/cache";
import { act, str } from "@/server/actions";
import { adminAction } from "@/server/auth/admin";
import { prisma } from "@/server/db/prisma";
import { audit } from "@/server/services/audit";
import { activateTenant, extendTrial, setPlatformSetting } from "@/server/services/platform";
import { DomainError } from "@/server/errors";
import { rupeesToMinor } from "@/lib/format";
import { z } from "zod";

const back = (p: string, ok: string) => `${p}?ok=${encodeURIComponent(ok)}`;

export async function suspendGymAction(fd: FormData) {
  const id = str(fd, "id");
  return act(`/admin/gyms/${id}`, async () => {
    const a = await adminAction();
    await prisma.tenant.update({ where: { id }, data: { status: "SUSPENDED" } });
    await audit({ tenantId: id, userId: a.user.id, action: "admin.gym_suspended", entity: "Tenant", entityId: id });
    return back(`/admin/gyms/${id}`, "Gym suspended. Users can no longer sign in.");
  });
}
export async function activateGymAction(fd: FormData) {
  const id = str(fd, "id");
  return act(`/admin/gyms/${id}`, async () => {
    const a = await adminAction();
    await activateTenant(id);
    await audit({ tenantId: id, userId: a.user.id, action: "admin.gym_activated", entity: "Tenant", entityId: id });
    return back(`/admin/gyms/${id}`, "Gym activated.");
  });
}
export async function extendTrialAction(fd: FormData) {
  const id = str(fd, "id");
  return act(`/admin/gyms/${id}`, async () => {
    const a = await adminAction();
    const days = Number(str(fd, "days"));
    if (!(days >= 1 && days <= 365)) throw new DomainError("Days must be 1–365.");
    await extendTrial(id, days);
    await audit({ tenantId: id, userId: a.user.id, action: "admin.trial_extended", meta: { days } });
    return back(`/admin/gyms/${id}`, `Trial extended by ${days} days.`);
  });
}
export async function changePlanAction(fd: FormData) {
  const id = str(fd, "id");
  return act(`/admin/gyms/${id}`, async () => {
    const a = await adminAction();
    const plan = await prisma.subscriptionPlan.findUniqueOrThrow({ where: { code: str(fd, "planCode") } });
    await prisma.tenant.update({ where: { id }, data: { planCode: plan.code } });
    await audit({ tenantId: id, userId: a.user.id, action: "admin.plan_changed", meta: { plan: plan.code } });
    return back(`/admin/gyms/${id}`, `Plan changed to ${plan.name}.`);
  });
}

const planSchema = z.object({ name: z.string().min(2), price: z.coerce.number().min(0), memberLimit: z.preprocess((v) => (v === "" ? null : v), z.coerce.number().int().min(1).nullable()), branchLimit: z.preprocess((v) => (v === "" ? null : v), z.coerce.number().int().min(1).nullable()), staffLimit: z.preprocess((v) => (v === "" ? null : v), z.coerce.number().int().min(1).nullable()) });
const FLAGS = ["attendance", "expenses", "trainers", "diet", "progressPhotos", "multiBranch", "whatsapp", "apiAccess", "customBranding"];
export async function savePlanAction(fd: FormData) {
  return act("/admin/plans", async () => {
    const a = await adminAction();
    const i = planSchema.parse({ name: fd.get("name"), price: fd.get("price"), memberLimit: fd.get("memberLimit") ?? "", branchLimit: fd.get("branchLimit") ?? "", staffLimit: fd.get("staffLimit") ?? "" });
    const plan = await prisma.subscriptionPlan.findUniqueOrThrow({ where: { id: str(fd, "id") } });
    const features = { ...(plan.features as object), ...Object.fromEntries(FLAGS.map((f) => [f, fd.get(`f_${f}`) === "on"])) };
    await prisma.subscriptionPlan.update({ where: { id: plan.id }, data: { name: i.name, priceMonthly: rupeesToMinor(i.price), memberLimit: i.memberLimit, branchLimit: i.branchLimit, staffLimit: i.staffLimit, features } });
    await audit({ userId: a.user.id, action: "admin.plan_updated", entity: "SubscriptionPlan", entityId: plan.id });
    revalidatePath("/pricing");
    return back("/admin/plans", "Plan saved. The public pricing page is updated.");
  });
}

const couponSchema = z.object({ code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,20}$/), discountType: z.enum(["PERCENTAGE", "FIXED"]), discountValue: z.coerce.number().positive(), maxDiscount: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().positive().optional()), expiresAt: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.date().optional()), usageLimit: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().int().positive().optional()) });
export async function createCouponAction(fd: FormData) {
  return act("/admin/coupons", async () => {
    const a = await adminAction();
    const i = couponSchema.parse({ code: fd.get("code"), discountType: fd.get("discountType"), discountValue: fd.get("discountValue"), maxDiscount: fd.get("maxDiscount"), expiresAt: fd.get("expiresAt"), usageLimit: fd.get("usageLimit") });
    if (i.discountType === "PERCENTAGE" && i.discountValue > 100) throw new DomainError("Percentage can't exceed 100.");
    const planCodes = fd.getAll("planCodes").map(String);
    if (await prisma.coupon.findUnique({ where: { code: i.code } })) throw new DomainError("That coupon code already exists.");
    await prisma.coupon.create({ data: { code: i.code, discountType: i.discountType, discountValue: i.discountType === "FIXED" ? rupeesToMinor(i.discountValue) : Math.round(i.discountValue), maxDiscount: i.maxDiscount ? rupeesToMinor(i.maxDiscount) : null, expiresAt: i.expiresAt, usageLimit: i.usageLimit, planCodes } });
    await audit({ userId: a.user.id, action: "admin.coupon_created", meta: { code: i.code } });
    return back("/admin/coupons", "Coupon created.");
  });
}
export async function toggleCouponAction(fd: FormData) {
  return act("/admin/coupons", async () => {
    await adminAction();
    const c = await prisma.coupon.findUniqueOrThrow({ where: { id: str(fd, "id") } });
    await prisma.coupon.update({ where: { id: c.id }, data: { isActive: !c.isActive } });
    return back("/admin/coupons", c.isActive ? "Coupon disabled." : "Coupon enabled.");
  });
}

export async function setLeadStatusAction(fd: FormData) {
  await adminAction();
  await prisma.lead.update({ where: { id: str(fd, "id") }, data: { status: str(fd, "status") as never } });
  revalidatePath("/admin/leads");
}

export async function adminReplyAction(fd: FormData) {
  const id = str(fd, "id");
  return act(`/admin/tickets/${id}`, async () => {
    const a = await adminAction();
    if (!str(fd, "body")) throw new DomainError("Write a reply first.");
    await prisma.supportMessage.create({ data: { ticketId: id, authorId: a.user.id, body: str(fd, "body").slice(0, 3000) } });
    await prisma.supportTicket.update({ where: { id }, data: { status: (str(fd, "status") || "IN_PROGRESS") as never, priority: (str(fd, "priority") || "NORMAL") as never, assignedTo: a.user.id } });
    return `/admin/tickets/${id}`;
  });
}

export async function saveSettingsAction(fd: FormData) {
  return act("/admin/settings", async () => {
    const a = await adminAction();
    const days = Number(str(fd, "trialDays"));
    if (!(days >= 1 && days <= 90)) throw new DomainError("Trial must be 1–90 days.");
    await setPlatformSetting("trialDays", days);
    await setPlatformSetting("maintenance", fd.get("maintenance") === "on");
    await setPlatformSetting("banner", str(fd, "banner").slice(0, 200));
    await audit({ userId: a.user.id, action: "admin.settings_changed" });
    return back("/admin/settings", "Platform settings saved.");
  });
}

export async function savePostAction(fd: FormData) {
  return act("/admin/blog", async () => {
    await adminAction();
    const slug = str(fd, "slug").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
    if (!slug || !str(fd, "title") || !str(fd, "body")) throw new DomainError("Title, slug and body are required.");
    const published = fd.get("published") === "on";
    const data = { title: str(fd, "title"), excerpt: str(fd, "excerpt") || null, body: str(fd, "body"), category: str(fd, "category") || null, tags: str(fd, "tags").split(",").map((t) => t.trim()).filter(Boolean), seoTitle: str(fd, "seoTitle") || null, seoDesc: str(fd, "seoDesc") || null, featuredImg: str(fd, "featuredImg") || null, published, publishedAt: published ? new Date() : null };
    await prisma.blogPost.upsert({ where: { slug }, update: data, create: { slug, ...data } });
    revalidatePath("/blog");
    return back("/admin/blog", published ? "Post published." : "Draft saved.");
  });
}

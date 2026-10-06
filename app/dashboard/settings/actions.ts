"use server";
import { act, formObject, str } from "@/server/actions";
import { actionAuth } from "@/server/auth/page";
import { saveSetting, updateGym } from "@/server/services/ops";
import { audit } from "@/server/services/audit";
import { DEFAULT_TEMPLATE } from "@/server/services/messaging";

const back = (tab: string, ok = "Settings saved.") => `/dashboard/settings?tab=${tab}&ok=${encodeURIComponent(ok)}`;

export async function saveGymAction(fd: FormData) {
  return act("/dashboard/settings", async () => {
    const ctx = await actionAuth("settings");
    await updateGym(ctx.db, formObject(fd));
    await audit({ tenantId: ctx.tenant.id, userId: ctx.user.id, action: "settings.gym_changed" });
    return back("gym");
  });
}
export async function saveTaxAction(fd: FormData) {
  return act("/dashboard/settings?tab=invoice", async () => {
    const ctx = await actionAuth("settings");
    const pct = Number(str(fd, "gstPct") || 18);
    if (!(pct >= 0 && pct <= 40)) throw new Error("GST % must be between 0 and 40");
    await saveSetting(ctx.db, ctx.tenant.id, "tax", { gstEnabled: fd.get("gstEnabled") === "on", gstPct: pct, interState: fd.get("interState") === "on" });
    await audit({ tenantId: ctx.tenant.id, userId: ctx.user.id, action: "settings.tax_changed" });
    return back("invoice");
  });
}
export async function saveRemindersAction(fd: FormData) {
  return act("/dashboard/settings?tab=reminders", async () => {
    const ctx = await actionAuth("settings");
    const on = (k: string) => fd.get(k) === "on";
    await saveSetting(ctx.db, ctx.tenant.id, "reminders", {
      d7: on("d7"), d3: on("d3"), d1: on("d1"), d0: on("d0"), overdue3: on("overdue3"),
      channels: ["EMAIL", "WHATSAPP", "SMS"].filter((c) => on(`ch_${c}`)), template: str(fd, "template").slice(0, 600) || DEFAULT_TEMPLATE,
    });
    return back("reminders");
  });
}
export async function saveOpsAction(fd: FormData) {
  return act("/dashboard/settings?tab=operations", async () => {
    const ctx = await actionAuth("settings");
    const days = Number(str(fd, "inactiveDays"));
    if (!(days >= 1 && days <= 365)) throw new Error("Inactive days must be 1–365");
    await saveSetting(ctx.db, ctx.tenant.id, "attendance", { inactiveDays: days });
    await saveSetting(ctx.db, ctx.tenant.id, "membership", { extendOnFreeze: fd.get("extendOnFreeze") === "on" });
    return back("operations");
  });
}

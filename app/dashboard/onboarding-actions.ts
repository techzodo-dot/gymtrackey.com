"use server";
import { act } from "@/server/actions";
import { actionAuth } from "@/server/auth/page";
import { hasSampleData, loadSampleData } from "@/server/services/sample-data";
import { DomainError } from "@/server/errors";

export async function loadSampleDataAction() {
  return act("/dashboard", async () => {
    const ctx = await actionAuth("settings");
    if (await hasSampleData(ctx.tenant.id)) throw new DomainError("Sample data can only be loaded into an empty gym.");
    await loadSampleData(ctx.tenant.id);
    return `/dashboard?ok=${encodeURIComponent("Sample data loaded: 50 members, 5 trainers, payments, attendance and more.")}`;
  });
}

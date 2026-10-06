import { redirect } from "next/navigation";
import { getAuth, requireRole } from "./guard";

export async function adminPage() {
  const ctx = await getAuth();
  if (!ctx || ctx.user.role !== "SUPER_ADMIN") redirect("/login");
  return ctx;
}
export const adminAction = () => requireRole("SUPER_ADMIN");

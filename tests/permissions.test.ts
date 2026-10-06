import { describe, expect, it } from "vitest";
import { can, effectivePermissions, homeFor } from "@/server/auth/permissions";

describe("permissions", () => {
  it("owner has everything", () => {
    expect(can("OWNER", [], "billing")).toBe(true);
  });
  it("receptionist can collect payments but not see reports/settings", () => {
    expect(can("RECEPTIONIST", [], "payments")).toBe(true);
    expect(can("RECEPTIONIST", [], "reports")).toBe(false);
    expect(can("RECEPTIONIST", [], "settings")).toBe(false);
  });
  it("trainer has no financial access by default", () => {
    expect(can("TRAINER", [], "payments")).toBe(false);
    expect(can("TRAINER", [], "workouts")).toBe(true);
  });
  it("custom permissions override defaults and drop unknown keys", () => {
    expect(effectivePermissions("MANAGER", ["expenses", "bogus"])).toEqual(["expenses"]);
  });
  it("members and super admins have no tenant permissions", () => {
    expect(can("MEMBER", [], "members")).toBe(false);
    expect(can("SUPER_ADMIN", [], "members")).toBe(false);
  });
  it("routes each role to its home", () => {
    expect(homeFor("SUPER_ADMIN")).toBe("/admin");
    expect(homeFor("OWNER")).toBe("/dashboard");
    expect(homeFor("TRAINER")).toBe("/trainer");
    expect(homeFor("MEMBER")).toBe("/member");
  });
});

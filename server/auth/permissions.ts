import type { Role } from "@prisma/client";

export const PERMISSIONS = [
  "members", "memberships", "payments", "attendance", "trainers", "staff",
  "workouts", "diets", "measurements", "reports", "expenses", "settings",
  "billing", "branches", "notifications", "support",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

/** Default permission sets. MANAGER/RECEPTIONIST/TRAINER can be customised per user. */
export const ROLE_DEFAULTS: Record<Role, readonly Permission[]> = {
  SUPER_ADMIN: [],
  OWNER: PERMISSIONS,
  MANAGER: ["members", "attendance", "payments", "memberships", "reports", "notifications"],
  RECEPTIONIST: ["members", "payments", "attendance", "memberships"],
  TRAINER: ["members", "workouts", "diets", "measurements", "attendance"],
  MEMBER: [],
};

export function isPermission(v: string): v is Permission {
  return (PERMISSIONS as readonly string[]).includes(v);
}

/** OWNER always has everything; staff use custom permissions when set, else role defaults. */
export function effectivePermissions(role: Role, custom: unknown): Permission[] {
  if (role === "OWNER") return [...PERMISSIONS];
  if (Array.isArray(custom) && custom.length > 0) {
    return custom.filter((p): p is Permission => typeof p === "string" && isPermission(p));
  }
  return [...ROLE_DEFAULTS[role]];
}

export function can(role: Role, custom: unknown, permission: Permission): boolean {
  if (role === "SUPER_ADMIN") return false; // platform admins use /admin, not tenant data
  return effectivePermissions(role, custom).includes(permission);
}

export const STAFF_ROLES: readonly Role[] = ["OWNER", "MANAGER", "TRAINER", "RECEPTIONIST"];

export function homeFor(role: Role): string {
  switch (role) {
    case "SUPER_ADMIN": return "/admin";
    case "TRAINER": return "/trainer";
    case "MEMBER": return "/member";
    default: return "/dashboard";
  }
}

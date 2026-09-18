import type { DashboardFilters, Profile, UserRole } from "@/lib/types";
import { isSuperAdmin, isTenantAdmin } from "@/lib/auth/tenant";

export type Permission =
  | "dashboard:view"
  | "dashboard:export"
  | "reports:operational"
  | "reports:team"
  | "field_visit:create"
  | "settlement:approve"
  | "admin:access"
  | "admin:users"
  | "admin:upload"
  | "admin:config"
  | "platform:tenants"
  | "platform:subscriptions"
  | "platform:activity"
  | "platform:limits";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: [
    "dashboard:view",
    "dashboard:export",
    "field_visit:create",
    "settlement:approve",
    "admin:access",
    "admin:users",
    "admin:upload",
    "admin:config",
    "platform:tenants",
    "platform:subscriptions",
    "platform:activity",
    "platform:limits",
  ],
  admin: [
    "dashboard:view",
    "dashboard:export",
    "field_visit:create",
    "settlement:approve",
    "admin:access",
    "admin:users",
    "admin:upload",
    "admin:config",
  ],
  manager: [
    "dashboard:view",
    "reports:operational",
    "field_visit:create",
    "settlement:approve",
    "admin:access",
    "admin:users",
    "admin:upload",
  ],
  team_leader: [
    "dashboard:view",
    "reports:team",
    "field_visit:create",
    "admin:access",
    "admin:users",
  ],
  agent: ["dashboard:view", "field_visit:create"],
};

export function hasPermission(profile: Profile, permission: Permission): boolean {
  if (!profile.is_active) return false;
  return ROLE_PERMISSIONS[profile.role]?.includes(permission) ?? false;
}

export function canAccessPlatform(profile: Profile): boolean {
  return hasPermission(profile, "platform:tenants");
}

export function canAccessAdmin(profile: Profile): boolean {
  return hasPermission(profile, "admin:access");
}

export function canManageTenants(profile: Profile): boolean {
  return hasPermission(profile, "platform:tenants");
}

export function canManageSubscriptions(profile: Profile): boolean {
  return hasPermission(profile, "platform:subscriptions");
}

export function canViewPlatformActivity(profile: Profile): boolean {
  return hasPermission(profile, "platform:activity");
}

export function canManageTenantLimits(profile: Profile): boolean {
  return hasPermission(profile, "platform:limits");
}

export function canExport(profile: Profile): boolean {
  return (
    hasPermission(profile, "dashboard:export") ||
    hasPermission(profile, "reports:operational") ||
    hasPermission(profile, "reports:team")
  );
}

export function canAccessFullReports(profile: Profile): boolean {
  return hasPermission(profile, "dashboard:export");
}

export function canManageUsers(profile: Profile): boolean {
  return hasPermission(profile, "admin:users");
}

export function canUploadData(profile: Profile): boolean {
  return hasPermission(profile, "admin:upload");
}

export function canManageConfig(profile: Profile): boolean {
  return hasPermission(profile, "admin:config");
}

export function canApproveSettlement(profile: Profile): boolean {
  return hasPermission(profile, "settlement:approve");
}

export function mergeRoleScope(
  profile: Profile,
  filters: DashboardFilters = {}
): DashboardFilters {
  const scoped = { ...filters };

  if (profile.tenant_id) {
    scoped.tenantId = profile.tenant_id;
  }

  switch (profile.role) {
    case "super_admin":
    case "admin":
      return scoped;
    case "manager":
      if (profile.agency_id) scoped.agencyId = profile.agency_id;
      return scoped;
    case "team_leader":
      if (profile.team_id) scoped.teamId = profile.team_id;
      else scoped.teamLeaderId = profile.id;
      return scoped;
    case "agent":
      scoped.agentId = profile.id;
      return scoped;
    default:
      return scoped;
  }
}

export function isPlatformOrTenantAdmin(profile: Profile): boolean {
  return isSuperAdmin(profile) || isTenantAdmin(profile);
}

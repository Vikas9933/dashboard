import type { Profile } from "@/lib/types";

export function isSuperAdmin(profile: Profile): boolean {
  return profile.role === "super_admin" && profile.is_active;
}

export function isTenantAdmin(profile: Profile): boolean {
  return profile.role === "admin" && profile.is_active && !!profile.tenant_id;
}

/** Returns tenant_id to filter queries, or null for platform super-admin (all tenants). */
export function resolveTenantScope(profile: Profile | null): string | null | undefined {
  if (!profile) return undefined;
  if (isSuperAdmin(profile)) return null;
  return profile.tenant_id ?? undefined;
}

export function canAccessTenantData(profile: Profile, tenantId: string | null): boolean {
  if (!profile.is_active) return false;
  if (isSuperAdmin(profile)) return true;
  return !!profile.tenant_id && profile.tenant_id === tenantId;
}

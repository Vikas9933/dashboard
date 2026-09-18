"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { canManageTenants } from "@/lib/auth/permissions";
import { canManageRole, creatableRoles } from "@/lib/auth/roles";
import { isSuperAdmin } from "@/lib/auth/tenant";
import { requireAdmin, requirePermission } from "@/lib/auth/session";
import { dashboardConfigSchema } from "@/lib/schemas/user";
import { fetchAuditLogs } from "@/lib/services/audit-service";
import { processAccountUpload } from "@/lib/services/upload-service";
import { createUser, rejectPendingUser, updateUser } from "@/lib/services/user-service";
import { deleteTenant, setTenantActiveStatus } from "@/lib/services/tenant-service";
import { provisionDefaultTenantStructure } from "@/lib/services/tenant-provisioning";
import { createClient } from "@/lib/supabase/server";
import { hasServiceRoleKey } from "@/lib/supabase/service";
import type { DashboardConfig, Tenant, UserRole } from "@/lib/types";
import type { UploadRow } from "@/lib/schemas/upload";

const createTenantSchema = z.object({
  name: z.string().min(2, "Client name is required."),
  slug: z
    .string()
    .min(2)
    .max(48)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only."),
});

async function resolveConfigTenantId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string | null
) {
  if (tenantId) return tenantId;
  const { data } = await supabase.from("tenants").select("id").eq("slug", "default").maybeSingle();
  return data?.id ?? null;
}

export async function getTenants(): Promise<Tenant[]> {
  const { supabase, profile } = await requirePermission("platform:tenants");
  if (!canManageTenants(profile)) return [];

  const { data, error } = await supabase
    .from("tenants")
    .select("id, name, slug, is_active, created_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Tenant[];
}

export async function createTenant(formData: FormData) {
  const { supabase, profile } = await requirePermission("platform:tenants");
  if (!canManageTenants(profile)) return { error: "Insufficient permissions." };

  const parsed = createTenantSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim().toLowerCase(),
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid tenant data." };
  }

  const { data: tenant, error } = await supabase
    .from("tenants")
    .insert({ name: parsed.data.name, slug: parsed.data.slug })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await supabase.from("dashboard_config").upsert([
    {
      tenant_id: tenant.id,
      id: "display",
      value: {
        currency: "INR",
        dateFormat: "DD/MM/YYYY",
        showWeeklyTrend: true,
        showMonthlyTrend: true,
        kpiTargetPercent: 75,
      },
    },
    {
      tenant_id: tenant.id,
      id: "labels",
      value: {
        dashboardTitle: `${parsed.data.name} Dashboard`,
        agencyLabel: "Agency",
      },
    },
  ]);

  const provision = await provisionDefaultTenantStructure(supabase, tenant.id, {
    clientName: parsed.data.name,
  });
  if (provision.error) {
    return {
      error: `Client created but default agency/team setup failed: ${provision.error}`,
    };
  }

  await logAudit({
    userId: profile.id,
    tenantId: tenant.id,
    action: "config.update",
    entity: "tenants",
    entityId: tenant.id,
    payload: { name: parsed.data.name, slug: parsed.data.slug },
  });

  revalidatePath("/dashboard/admin");
  return {
    success: `Client "${parsed.data.name}" created with default agency and team. Sign-up link: /signup?tenant=${parsed.data.slug}`,
  };
}

export async function getAdminUsers() {
  const { supabase, profile } = await requireAdmin();

  let query = supabase
    .from("profiles")
    .select("id, email, full_name, role, tenant_id, agency_id, team_id, is_active, created_at")
    .neq("role", "super_admin")
    .order("created_at", { ascending: false });

  if (!isSuperAdmin(profile)) {
    if (!profile.tenant_id) {
      return [];
    }
    query = query.eq("tenant_id", profile.tenant_id);
  }

  if (profile.role === "manager" && profile.agency_id) {
    query = query.or(`is_active.eq.false,and(is_active.eq.true,agency_id.eq.${profile.agency_id})`);
  } else if (profile.role === "team_leader" && profile.team_id) {
    query = query.or(`is_active.eq.false,and(is_active.eq.true,team_id.eq.${profile.team_id})`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getAdminReferenceData() {
  const { supabase, profile } = await requireAdmin();

  let agenciesQuery = supabase.from("agencies").select("id, name").eq("is_active", true);
  let teamsQuery = supabase.from("teams").select("id, name, agency_id").eq("is_active", true);

  if (profile.tenant_id) {
    agenciesQuery = agenciesQuery.eq("tenant_id", profile.tenant_id);
  }

  if (profile.role === "manager" && profile.agency_id) {
    agenciesQuery = agenciesQuery.eq("id", profile.agency_id);
  }

  const [agencies, teams] = await Promise.all([agenciesQuery, teamsQuery]);

  let teamsList = teams.data ?? [];
  if (profile.tenant_id) {
    const agencyIds = new Set((agencies.data ?? []).map((a) => a.id));
    teamsList = teamsList.filter((t) => agencyIds.has(t.agency_id));
  }

  if (profile.role === "team_leader" && profile.team_id) {
    teamsList = teamsList.filter((t) => t.id === profile.team_id);
  }

  return {
    agencies: agencies.data ?? [],
    teams: teamsList,
    hasServiceRole: hasServiceRoleKey(),
    isSuperAdmin: isSuperAdmin(profile),
    tenantId: profile.tenant_id,
    tenants: isSuperAdmin(profile)
      ? ((await supabase.from("tenants").select("id, name, slug").eq("is_active", true)).data ?? [])
      : [],
  };
}

export async function getDashboardConfig(): Promise<DashboardConfig> {
  const defaults: DashboardConfig = {
    currency: "INR",
    dateFormat: "DD/MM/YYYY",
    showWeeklyTrend: true,
    showMonthlyTrend: true,
    kpiTargetPercent: 75,
    dashboardTitle: "Collection & Recovery Dashboard",
  };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return defaults;

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, role")
    .eq("id", user.id)
    .maybeSingle();

  const configTenantId = await resolveConfigTenantId(supabase, profile?.tenant_id ?? null);
  if (!configTenantId) return defaults;

  const { data, error } = await supabase
    .from("dashboard_config")
    .select("id, value")
    .eq("tenant_id", configTenantId);

  if (error || !data?.length) return defaults;

  const display = data.find((r) => r.id === "display")?.value as Record<string, unknown> | undefined;
  const labels = data.find((r) => r.id === "labels")?.value as Record<string, unknown> | undefined;

  return {
    currency: (display?.currency as string) ?? defaults.currency,
    dateFormat: (display?.dateFormat as string) ?? defaults.dateFormat,
    showWeeklyTrend: display?.showWeeklyTrend !== false,
    showMonthlyTrend: display?.showMonthlyTrend !== false,
    kpiTargetPercent: Number(display?.kpiTargetPercent ?? defaults.kpiTargetPercent),
    dashboardTitle: (labels?.dashboardTitle as string) ?? defaults.dashboardTitle,
  };
}

export async function createAdminUser(formData: FormData) {
  const { supabase, profile } = await requireAdmin();

  const role = String(formData.get("role") ?? "agent") as UserRole;
  if (role === "super_admin") return { error: "Cannot create platform super-admin from this panel." };
  if (!canManageRole(profile, role)) {
    return { error: `You cannot create users with the ${role} role.` };
  }

  let tenantId = profile.tenant_id;
  if (isSuperAdmin(profile)) {
    tenantId = String(formData.get("tenantId") ?? "") || null;
    if (!tenantId) return { error: "Select a client account for the new user." };
  }

  const result = await createUser(
    supabase,
    { ...profile, tenant_id: tenantId },
    {
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    fullName: String(formData.get("fullName") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    role,
    agencyId: String(formData.get("agencyId") ?? "") || null,
    teamId: String(formData.get("teamId") ?? "") || null,
  });

  if (result.error) return { error: result.error };
  revalidatePath("/dashboard/admin");
  return { success: result.success };
}

export async function rejectSignupRequest(formData: FormData) {
  const { supabase, profile } = await requireAdmin();

  const profileId = String(formData.get("profileId") ?? "");
  if (!profileId) return { error: "Missing user id." };

  const result = await rejectPendingUser(supabase, profile, profileId);
  if (result.error) return { error: result.error };

  revalidatePath("/dashboard/admin");
  return { success: result.success };
}

export async function deactivateTenant(formData: FormData) {
  const { profile } = await requirePermission("platform:tenants");
  if (!canManageTenants(profile)) return { error: "Insufficient permissions." };

  const tenantId = String(formData.get("tenantId") ?? "");
  const isActive = formData.get("isActive") === "true";
  const result = await setTenantActiveStatus(profile, tenantId, isActive);

  if (result.error) return { error: result.error };
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/platform");
  return { success: result.success };
}

export async function removeTenant(formData: FormData) {
  const { profile } = await requirePermission("platform:tenants");
  if (!canManageTenants(profile)) return { error: "Insufficient permissions." };

  const tenantId = String(formData.get("tenantId") ?? "");
  if (!tenantId) return { error: "Missing client id." };

  const result = await deleteTenant(profile, tenantId);
  if (result.error) return { error: result.error };

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/platform");
  return { success: result.success };
}

export async function updateUserRole(formData: FormData) {
  const { supabase, profile } = await requireAdmin();

  const role = String(formData.get("role") ?? "") as UserRole;
  if (role === "super_admin") return { error: "Cannot assign super-admin role from this panel." };
  if (!canManageRole(profile, role)) {
    return { error: `You cannot assign the ${role} role.` };
  }

  const result = await updateUser(supabase, profile, {
    profileId: String(formData.get("profileId") ?? ""),
    role,
    agencyId: String(formData.get("agencyId") ?? "") || null,
    teamId: String(formData.get("teamId") ?? "") || null,
    isActive: formData.get("isActive") === "true",
  });

  if (result.error) return { error: result.error };
  revalidatePath("/dashboard/admin");
  return { success: result.success };
}

export async function updateDashboardConfig(formData: FormData) {
  const { supabase, profile } = await requireAdmin();

  if (!profile.tenant_id && !isSuperAdmin(profile)) {
    return { error: "Tenant context required to update dashboard configuration." };
  }

  const parsed = dashboardConfigSchema.safeParse({
    dashboardTitle: String(formData.get("dashboardTitle") ?? "").trim(),
    kpiTargetPercent: formData.get("kpiTargetPercent"),
    showWeeklyTrend: formData.get("showWeeklyTrend") === "on",
    showMonthlyTrend: formData.get("showMonthlyTrend") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid configuration." };
  }

  const configTenantId = await resolveConfigTenantId(supabase, profile.tenant_id);
  if (!configTenantId) return { error: "No tenant found for configuration." };

  const displayValue = {
    currency: "INR",
    dateFormat: "DD/MM/YYYY",
    showWeeklyTrend: parsed.data.showWeeklyTrend,
    showMonthlyTrend: parsed.data.showMonthlyTrend,
    kpiTargetPercent: parsed.data.kpiTargetPercent,
  };

  const labelsValue = {
    dashboardTitle: parsed.data.dashboardTitle,
    agencyLabel: "Agency",
  };

  const [displayRes, labelsRes] = await Promise.all([
    supabase.from("dashboard_config").upsert({
      tenant_id: configTenantId,
      id: "display",
      value: displayValue,
      updated_by: profile.id,
    }),
    supabase.from("dashboard_config").upsert({
      tenant_id: configTenantId,
      id: "labels",
      value: labelsValue,
      updated_by: profile.id,
    }),
  ]);

  if (displayRes.error) return { error: displayRes.error.message };
  if (labelsRes.error) return { error: labelsRes.error.message };

  await logAudit({
    userId: profile.id,
    tenantId: configTenantId,
    action: "config.update",
    entity: "dashboard_config",
    payload: displayValue,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/admin");
  return { success: "Dashboard configuration saved." };
}

export async function uploadAccountsFromRows(rows: UploadRow[]) {
  const { supabase, profile } = await requireAdmin();
  const result = await processAccountUpload(supabase, profile, rows);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/admin");
  return result;
}

export async function getAuditLogs(limit = 50) {
  const { supabase, profile } = await requireAdmin();
  return fetchAuditLogs(supabase, {
    limit,
    tenantId: profile.tenant_id ?? undefined,
    superAdmin: isSuperAdmin(profile),
  });
}

export async function resolveTenantBySlug(slug: string) {
  const { resolveTenantBySlug: resolve } = await import("@/lib/auth/signup");
  return resolve(slug);
}

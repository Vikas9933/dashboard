"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import {
  canManageSubscriptions,
  canManageTenantLimits,
  canManageTenants,
  canViewPlatformActivity,
} from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { fetchAuditLogs } from "@/lib/services/audit-service";
import { deleteTenant, setTenantActiveStatus } from "@/lib/services/tenant-service";
import { provisionDefaultTenantStructure } from "@/lib/services/tenant-provisioning";
import {
  DEFAULT_SUBSCRIPTION_PLAN_CODE,
  sortSubscriptionPlans,
} from "@/lib/subscriptions/plans";
import { createClient } from "@/lib/supabase/server";
import type { SubscriptionPlan, Tenant, TenantUsageRow } from "@/lib/types";

const TENANT_CORE_SELECT = "id, name, slug, is_active, created_at";
const TENANT_PLATFORM_SELECT =
  "id, name, slug, is_active, created_at, subscription_plan_id, max_users, max_storage_mb, storage_used_mb, feature_flags";

function isMissingTenantColumnError(message: string, column: string) {
  return message.includes(column);
}

type TenantUsageQueryRow = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  max_users: number | null;
  max_storage_mb: number | null;
  storage_used_mb: number;
  subscription_plan_id: string | null;
  subscription_plans:
    | { name: string; max_users: number; max_storage_mb: number }
    | { name: string; max_users: number; max_storage_mb: number }[]
    | null;
};

const createTenantSchema = z.object({
  name: z.string().min(2, "Client name is required."),
  slug: z
    .string()
    .min(2)
    .max(48)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only."),
  planId: z.string().uuid().optional(),
});

const tenantLimitsSchema = z.object({
  tenantId: z.string().uuid(),
  maxUsers: z.coerce.number().int().min(1).max(10000),
  maxStorageMb: z.coerce.number().int().min(64).max(102400),
});

const tenantFeaturesSchema = z.object({
  tenantId: z.string().uuid(),
  export: z.boolean(),
  upload: z.boolean(),
  settlements: z.boolean(),
  audit: z.boolean(),
  field_visits: z.boolean(),
});

const planFeaturesSchema = z.object({
  planId: z.string().uuid(),
  export: z.boolean(),
  upload: z.boolean(),
  settlements: z.boolean(),
  audit: z.boolean(),
  field_visits: z.boolean(),
  api: z.boolean().optional(),
});

export async function getPlatformTenants(): Promise<Tenant[]> {
  const { supabase, profile } = await requirePermission("platform:tenants");
  if (!canManageTenants(profile)) return [];

  const full = await supabase
    .from("tenants")
    .select(TENANT_PLATFORM_SELECT)
    .order("created_at", { ascending: false });

  if (!full.error) {
    return (full.data ?? []) as Tenant[];
  }

  if (!isMissingTenantColumnError(full.error.message, "subscription_plan_id")) {
    throw new Error(full.error.message);
  }

  const basic = await supabase
    .from("tenants")
    .select(TENANT_CORE_SELECT)
    .order("created_at", { ascending: false });

  if (basic.error) throw new Error(basic.error.message);
  return (basic.data ?? []) as Tenant[];
}

export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const { supabase, profile } = await requirePermission("platform:subscriptions");
  if (!canManageSubscriptions(profile)) return [];

  const { data, error } = await supabase
    .from("subscription_plans")
    .select("id, code, name, description, max_users, max_storage_mb, features, is_active")
    .order("max_users", { ascending: true });

  if (error) {
    if (error.message.includes("subscription_plans")) return [];
    throw new Error(error.message);
  }
  const mapped = (data ?? []).map((row) => ({
    ...row,
    features: (row.features ?? {}) as Record<string, boolean>,
  })) as SubscriptionPlan[];

  return sortSubscriptionPlans(mapped.filter((plan) => plan.is_active));
}

export async function getTenantUsage(): Promise<TenantUsageRow[]> {
  const { supabase, profile } = await requirePermission("platform:limits");
  if (!canManageTenantLimits(profile)) return [];

  const full = await supabase
    .from("tenants")
    .select(
      "id, name, slug, is_active, max_users, max_storage_mb, storage_used_mb, subscription_plan_id, subscription_plans(name, max_users, max_storage_mb)"
    )
    .order("name");

  let tenants: TenantUsageQueryRow[] | null = (full.data as TenantUsageQueryRow[] | null) ?? null;
  if (full.error) {
    if (!isMissingTenantColumnError(full.error.message, "subscription_plan_id")) {
      throw new Error(full.error.message);
    }
    const basic = await supabase
      .from("tenants")
      .select("id, name, slug, is_active")
      .order("name");
    if (basic.error) throw new Error(basic.error.message);
    tenants =
      basic.data?.map((t) => ({
        ...t,
        max_users: null,
        max_storage_mb: null,
        storage_used_mb: 0,
        subscription_plan_id: null,
        subscription_plans: null,
      })) ?? [];
  }

  const rows: TenantUsageRow[] = [];

  for (const tenant of tenants ?? []) {
    const plan = tenant.subscription_plans as
      | { name: string; max_users: number; max_storage_mb: number }
      | { name: string; max_users: number; max_storage_mb: number }[]
      | null;
    const planRow = Array.isArray(plan) ? plan[0] : plan;

    const [{ count: userCount }, { count: accountCount }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenant.id)
        .neq("role", "super_admin"),
      supabase
        .from("accounts")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenant.id),
    ]);

    rows.push({
      tenant_id: tenant.id,
      tenant_name: tenant.name,
      slug: tenant.slug,
      is_active: tenant.is_active,
      plan_name: planRow?.name ?? null,
      user_count: userCount ?? 0,
      account_count: accountCount ?? 0,
      max_users: tenant.max_users ?? planRow?.max_users ?? 10,
      max_storage_mb: tenant.max_storage_mb ?? planRow?.max_storage_mb ?? 512,
      storage_used_mb: tenant.storage_used_mb ?? 0,
    });
  }

  return rows;
}

export async function getPlatformActivity(limit = 100) {
  const { supabase, profile } = await requirePermission("platform:activity");
  if (!canViewPlatformActivity(profile)) return [];

  return fetchAuditLogs(supabase, { limit, superAdmin: true });
}

export async function createPlatformTenant(formData: FormData) {
  const { supabase, profile } = await requirePermission("platform:tenants");
  if (!canManageTenants(profile)) return { error: "Insufficient permissions." };

  const parsed = createTenantSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim().toLowerCase(),
    planId: String(formData.get("planId") ?? "") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid client data." };
  }

  let planId = parsed.data.planId;
  if (!planId) {
    const { data: defaultPlan, error: planError } = await supabase
      .from("subscription_plans")
      .select("id")
      .eq("code", DEFAULT_SUBSCRIPTION_PLAN_CODE)
      .maybeSingle();
    if (!planError) {
      planId = defaultPlan?.id;
    }
  }

  const basePayload = {
    name: parsed.data.name,
    slug: parsed.data.slug,
  };

  let tenant: { id: string } | null = null;

  if (planId) {
    const withPlan = await supabase
      .from("tenants")
      .insert({ ...basePayload, subscription_plan_id: planId })
      .select("id")
      .single();

    if (withPlan.data) {
      tenant = withPlan.data;
    } else if (
      withPlan.error &&
      !isMissingTenantColumnError(withPlan.error.message, "subscription_plan_id")
    ) {
      return { error: withPlan.error.message };
    }
  }

  if (!tenant) {
    const basic = await supabase.from("tenants").insert(basePayload).select("id").single();
    if (basic.error) return { error: basic.error.message };
    tenant = basic.data;
  }

  if (!tenant) return { error: "Could not create client." };

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
    action: "tenant.create",
    entity: "tenants",
    entityId: tenant.id,
    payload: { name: parsed.data.name, slug: parsed.data.slug },
  });

  revalidatePath("/dashboard/platform");
  return {
    success: `Client "${parsed.data.name}" created with default agency and team. Sign-up: /signup?tenant=${parsed.data.slug}`,
  };
}

export async function setTenantActive(formData: FormData) {
  const { profile } = await requirePermission("platform:tenants");
  if (!canManageTenants(profile)) return { error: "Insufficient permissions." };

  const tenantId = String(formData.get("tenantId") ?? "");
  const isActive = formData.get("isActive") === "true";
  const result = await setTenantActiveStatus(profile, tenantId, isActive);

  if (result.error) return { error: result.error };
  revalidatePath("/dashboard/platform");
  revalidatePath("/dashboard/admin");
  return { success: result.success };
}

export async function removePlatformTenant(formData: FormData) {
  const { profile } = await requirePermission("platform:tenants");
  if (!canManageTenants(profile)) return { error: "Insufficient permissions." };

  const tenantId = String(formData.get("tenantId") ?? "");
  if (!tenantId) return { error: "Missing client id." };

  const result = await deleteTenant(profile, tenantId);
  if (result.error) return { error: result.error };

  revalidatePath("/dashboard/platform");
  revalidatePath("/dashboard/admin");
  return { success: result.success };
}

export async function updateTenantPlan(formData: FormData) {
  const { supabase, profile } = await requirePermission("platform:subscriptions");
  if (!canManageSubscriptions(profile)) return { error: "Insufficient permissions." };

  const tenantId = String(formData.get("tenantId") ?? "");
  const planId = String(formData.get("planId") ?? "");

  const { error } = await supabase
    .from("tenants")
    .update({ subscription_plan_id: planId, max_users: null, max_storage_mb: null })
    .eq("id", tenantId);

  if (error) return { error: error.message };

  await logAudit({
    userId: profile.id,
    tenantId,
    action: "tenant.plan_change",
    entity: "tenants",
    entityId: tenantId,
    payload: { planId },
  });

  revalidatePath("/dashboard/platform");
  return { success: "Subscription plan updated." };
}

export async function updateTenantLimits(formData: FormData) {
  const { supabase, profile } = await requirePermission("platform:limits");
  if (!canManageTenantLimits(profile)) return { error: "Insufficient permissions." };

  const parsed = tenantLimitsSchema.safeParse({
    tenantId: String(formData.get("tenantId") ?? ""),
    maxUsers: formData.get("maxUsers"),
    maxStorageMb: formData.get("maxStorageMb"),
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid limits." };
  }

  const { error } = await supabase
    .from("tenants")
    .update({
      max_users: parsed.data.maxUsers,
      max_storage_mb: parsed.data.maxStorageMb,
    })
    .eq("id", parsed.data.tenantId);

  if (error) return { error: error.message };

  await logAudit({
    userId: profile.id,
    tenantId: parsed.data.tenantId,
    action: "tenant.limits_update",
    entity: "tenants",
    entityId: parsed.data.tenantId,
    payload: parsed.data,
  });

  revalidatePath("/dashboard/platform");
  return { success: "User and storage limits updated." };
}

export async function updateTenantFeatures(formData: FormData) {
  const { supabase, profile } = await requirePermission("platform:subscriptions");
  if (!canManageSubscriptions(profile)) return { error: "Insufficient permissions." };

  const parsed = tenantFeaturesSchema.safeParse({
    tenantId: String(formData.get("tenantId") ?? ""),
    export: formData.get("export") === "on",
    upload: formData.get("upload") === "on",
    settlements: formData.get("settlements") === "on",
    audit: formData.get("audit") === "on",
    field_visits: formData.get("field_visits") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid feature flags." };
  }

  const { tenantId, ...flags } = parsed.data;
  const { error } = await supabase
    .from("tenants")
    .update({ feature_flags: flags })
    .eq("id", tenantId);

  if (error) return { error: error.message };

  await logAudit({
    userId: profile.id,
    tenantId,
    action: "tenant.features_update",
    entity: "tenants",
    entityId: tenantId,
    payload: flags,
  });

  revalidatePath("/dashboard/platform");
  return { success: "Client feature access updated." };
}

export async function updatePlanFeatures(formData: FormData) {
  const { supabase, profile } = await requirePermission("platform:subscriptions");
  if (!canManageSubscriptions(profile)) return { error: "Insufficient permissions." };

  const parsed = planFeaturesSchema.safeParse({
    planId: String(formData.get("planId") ?? ""),
    export: formData.get("export") === "on",
    upload: formData.get("upload") === "on",
    settlements: formData.get("settlements") === "on",
    audit: formData.get("audit") === "on",
    field_visits: formData.get("field_visits") === "on",
    api: formData.get("api") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid plan features." };
  }

  const { planId, ...features } = parsed.data;
  const { error } = await supabase
    .from("subscription_plans")
    .update({ features })
    .eq("id", planId);

  if (error) return { error: error.message };

  await logAudit({
    userId: profile.id,
    action: "plan.features_update",
    entity: "subscription_plans",
    entityId: planId,
    payload: features,
  });

  revalidatePath("/dashboard/platform");
  return { success: "Plan features updated." };
}

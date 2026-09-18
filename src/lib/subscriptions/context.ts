import { createServiceClient, hasServiceRoleKey } from "@/lib/supabase/service";
import { isSuperAdmin } from "@/lib/auth/tenant";
import type { Profile, PlanStatus, TenantSubscriptionContext } from "@/lib/types";
import { DEFAULT_SUBSCRIPTION_PLAN_CODE, SUBSCRIPTION_PLAN_DEFAULTS } from "./plans";
import { mergeFeatureFlags } from "./features";

type SupabaseClient = Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>;

/** organizationId === tenant_id in this codebase */
export type OrganizationId = string;

export async function getTenantSubscriptionContext(
  supabase: SupabaseClient,
  organizationId: OrganizationId | null,
  profile?: Profile | null
): Promise<TenantSubscriptionContext | null> {
  if (profile && isSuperAdmin(profile)) {
    return {
      organizationId: null,
      organizationName: "Platform",
      planCode: "enterprise",
      planName: "Super Admin",
      planStatus: "active",
      userLimit: 999999,
      storageLimitMb: 999999,
      currentUserCount: 0,
      currentStorageUsedMb: 0,
      planFeatures: {},
      featureOverrides: {},
      isSuperAdmin: true,
    };
  }

  if (!organizationId) return null;

  const { data: tenant, error } = await supabase
    .from("tenants")
    .select(
      "id, name, slug, plan_status, max_users, max_storage_mb, storage_used_mb, feature_flags, subscription_plan_id, subscription_plans(code, name, max_users, max_storage_mb, features)"
    )
    .eq("id", organizationId)
    .maybeSingle();

  if (error || !tenant) return null;

  const plan = tenant.subscription_plans as
    | {
        code: string;
        name: string;
        max_users: number;
        max_storage_mb: number;
        features: Record<string, boolean>;
      }
    | {
        code: string;
        name: string;
        max_users: number;
        max_storage_mb: number;
        features: Record<string, boolean>;
      }[]
    | null;

  const planRow = Array.isArray(plan) ? plan[0] : plan;
  const planCode = planRow?.code ?? DEFAULT_SUBSCRIPTION_PLAN_CODE;
  const defaults = SUBSCRIPTION_PLAN_DEFAULTS[planCode as keyof typeof SUBSCRIPTION_PLAN_DEFAULTS];

  const { data: usage } = await supabase
    .from("organization_usage")
    .select("current_user_count, current_storage_used_mb")
    .eq("tenant_id", organizationId)
    .maybeSingle();

  const userCount =
    usage?.current_user_count ??
    (await countTenantUsers(supabase, organizationId));

  return {
    organizationId,
    organizationName: tenant.name,
    planCode,
    planName: planRow?.name ?? defaults?.name ?? "Standard",
    planStatus: (tenant.plan_status as PlanStatus) ?? "active",
    userLimit: tenant.max_users ?? planRow?.max_users ?? defaults?.maxUsers ?? 25,
    storageLimitMb: tenant.max_storage_mb ?? planRow?.max_storage_mb ?? defaults?.maxStorageMb ?? 1024,
    currentUserCount: userCount,
    currentStorageUsedMb: usage?.current_storage_used_mb ?? tenant.storage_used_mb ?? 0,
    planFeatures: (planRow?.features ?? {}) as Record<string, boolean>,
    featureOverrides: (tenant.feature_flags ?? {}) as Record<string, boolean>,
    isSuperAdmin: false,
  };
}

async function countTenantUsers(supabase: SupabaseClient, tenantId: string) {
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .neq("role", "super_admin");
  return count ?? 0;
}

export async function syncOrganizationUsage(organizationId: OrganizationId) {
  if (!organizationId) return;

  if (hasServiceRoleKey()) {
    const service = createServiceClient();
    await service.rpc("sync_organization_usage", { p_tenant_id: organizationId });
    return;
  }

  const supabase = await import("@/lib/supabase/server").then((m) => m.createClient());
  await supabase.rpc("sync_organization_usage", { p_tenant_id: organizationId });
}

export async function incrementOrganizationStorage(
  organizationId: OrganizationId,
  addedMb: number
) {
  if (!organizationId || addedMb <= 0) return;

  const service = hasServiceRoleKey() ? createServiceClient() : await import("@/lib/supabase/server").then((m) => m.createClient());

  const { data: tenant } = await service
    .from("tenants")
    .select("storage_used_mb")
    .eq("id", organizationId)
    .maybeSingle();

  const next = (tenant?.storage_used_mb ?? 0) + Math.ceil(addedMb);

  await service.from("tenants").update({ storage_used_mb: next }).eq("id", organizationId);
  await syncOrganizationUsage(organizationId);
}

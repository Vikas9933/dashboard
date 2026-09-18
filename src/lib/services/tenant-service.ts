import { logAudit } from "@/lib/audit";
import { isSuperAdmin } from "@/lib/auth/tenant";
import { createServiceClient, hasServiceRoleKey } from "@/lib/supabase/service";
import type { Profile } from "@/lib/types";

async function deleteAccountsForTenant(
  service: ReturnType<typeof createServiceClient>,
  tenantId: string
) {
  const { data: accounts } = await service
    .from("accounts")
    .select("id")
    .eq("tenant_id", tenantId);

  const accountIds = (accounts ?? []).map((a) => a.id);
  if (accountIds.length === 0) return;

  const tables = ["settlement_requests", "field_visits", "ptp_records", "collection_payments"] as const;

  for (const table of tables) {
    await service.from(table).delete().in("account_id", accountIds);
  }

  await service.from("accounts").delete().eq("tenant_id", tenantId);
}

export async function deleteTenant(admin: Profile, tenantId: string) {
  if (!isSuperAdmin(admin)) {
    return { error: "Only the platform super admin can delete a client." };
  }

  if (!hasServiceRoleKey()) {
    return {
      error: "Set SUPABASE_SERVICE_ROLE_KEY in .env.local to delete client accounts.",
    };
  }

  const service = createServiceClient();

  const { data: tenant, error: tenantError } = await service
    .from("tenants")
    .select("id, name, slug")
    .eq("id", tenantId)
    .maybeSingle();

  if (tenantError) return { error: tenantError.message };
  if (!tenant) return { error: "Client not found." };
  if (tenant.slug === "default") {
    return { error: "The default client cannot be deleted." };
  }

  await deleteAccountsForTenant(service, tenantId);
  await service.from("customers").delete().eq("tenant_id", tenantId);

  const { data: agencies } = await service
    .from("agencies")
    .select("id")
    .eq("tenant_id", tenantId);

  const agencyIds = (agencies ?? []).map((a) => a.id);
  if (agencyIds.length > 0) {
    await service.from("teams").delete().in("agency_id", agencyIds);
    await service.from("agencies").delete().eq("tenant_id", tenantId);
  }

  await service.from("dashboard_config").delete().eq("tenant_id", tenantId);

  const { data: profiles } = await service
    .from("profiles")
    .select("id, role")
    .eq("tenant_id", tenantId);

  for (const profile of profiles ?? []) {
    if (profile.role === "super_admin") continue;
    await service.auth.admin.deleteUser(profile.id);
  }

  const { error: deleteError } = await service.from("tenants").delete().eq("id", tenantId);
  if (deleteError) return { error: deleteError.message };

  await logAudit({
    userId: admin.id,
    tenantId: null,
    action: "tenant.delete",
    entity: "tenants",
    entityId: tenantId,
    payload: { name: tenant.name, slug: tenant.slug },
  });

  return { success: `Client "${tenant.name}" and all associated data were deleted.` };
}

export async function setTenantActiveStatus(
  admin: Profile,
  tenantId: string,
  isActive: boolean
) {
  if (!isSuperAdmin(admin)) {
    return { error: "Only the platform super admin can change client status." };
  }

  const service = createServiceClient();
  const { error } = await service
    .from("tenants")
    .update({ is_active: isActive })
    .eq("id", tenantId);

  if (error) return { error: error.message };

  await logAudit({
    userId: admin.id,
    tenantId,
    action: isActive ? "tenant.activate" : "tenant.deactivate",
    entity: "tenants",
    entityId: tenantId,
    payload: { isActive },
  });

  return {
    success: isActive ? "Client activated — sign-up link works again." : "Client deactivated.",
  };
}

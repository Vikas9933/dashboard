import { createClient } from "@/lib/supabase/server";
import { createServiceClient, hasServiceRoleKey } from "@/lib/supabase/service";

export { DEFAULT_SIGNUP_TENANT_SLUG, signupPath } from "@/lib/auth/signup-constants";

export async function resolveTenantBySlug(slug: string) {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return null;

  if (hasServiceRoleKey()) {
    const service = createServiceClient();
    const { data } = await service
      .from("tenants")
      .select("id, name, slug")
      .eq("slug", normalized)
      .eq("is_active", true)
      .maybeSingle();
    if (data) return data;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("tenants")
    .select("id, name, slug")
    .eq("slug", normalized)
    .eq("is_active", true)
    .maybeSingle();

  return data;
}

/** True when no profiles exist — first signup becomes platform super_admin. */
export async function needsPlatformBootstrap() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_platform_bootstrap");

  if (!error && typeof data === "boolean") {
    return data;
  }

  if (!hasServiceRoleKey()) return false;

  const service = createServiceClient();
  const { count, error: countError } = await service
    .from("profiles")
    .select("id", { count: "exact", head: true });

  if (countError) return false;
  return (count ?? 0) === 0;
}

export async function canRegisterWithoutTenantSlug() {
  return needsPlatformBootstrap();
}

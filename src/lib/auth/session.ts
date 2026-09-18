import { createClient } from "@/lib/supabase/server";
import type { Permission } from "@/lib/auth/permissions";
import { hasPermission } from "@/lib/auth/permissions";
import type { Profile } from "@/lib/types";

export async function getSessionProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, tenant_id, agency_id, team_id, is_active")
    .eq("id", user.id)
    .single();

  return data;
}

export async function requireAuth(): Promise<{ supabase: Awaited<ReturnType<typeof createClient>>; profile: Profile }> {
  const supabase = await createClient();
  const profile = await getSessionProfile();

  if (!profile) throw new Error("Not authenticated.");
  if (!profile.is_active) throw new Error("Account pending approval.");

  return { supabase, profile };
}

export async function requireAdmin() {
  return requirePermission("admin:access");
}

export async function requirePermission(permission: Permission) {
  const ctx = await requireAuth();
  if (!hasPermission(ctx.profile, permission)) {
    throw new Error("Insufficient permissions.");
  }
  return ctx;
}

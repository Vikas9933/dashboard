import { NextResponse } from "next/server";
import { mapServiceError } from "@/lib/api/response";
import { isSuperAdmin } from "@/lib/auth/tenant";
import { requirePermission } from "@/lib/auth/session";

export async function GET() {
  try {
    const { supabase, profile } = await requirePermission("admin:users");

    let query = supabase
      .from("profiles")
      .select("id, email, full_name, role, tenant_id, agency_id, team_id, is_active, created_at")
      .neq("role", "super_admin")
      .order("created_at", { ascending: false });

    if (!isSuperAdmin(profile)) {
      if (!profile.tenant_id) {
        return NextResponse.json({ users: [] });
      }
      query = query.eq("tenant_id", profile.tenant_id);
    }

    const { data, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ users: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch users.";
    return mapServiceError(message);
  }
}

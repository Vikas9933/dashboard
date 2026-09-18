import type { SupabaseClient } from "@supabase/supabase-js";

export interface AuditLogEntry {
  id: string;
  action: string;
  entity: string;
  entity_id: string | null;
  created_at: string;
  profiles: { full_name: string; email: string } | null;
}

export async function fetchAuditLogs(
  supabase: SupabaseClient,
  options: {
    limit?: number;
    offset?: number;
    action?: string;
    tenantId?: string;
    superAdmin?: boolean;
  } = {}
) {
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;

  let query = supabase
    .from("audit_logs")
    .select("id, action, entity, entity_id, payload, created_at, profiles(full_name, email)")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (options.action) {
    query = query.eq("action", options.action);
  }

  if (options.tenantId && !options.superAdmin) {
    query = query.eq("tenant_id", options.tenantId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id as string,
      action: row.action as string,
      entity: row.entity as string,
      entity_id: row.entity_id as string | null,
      created_at: row.created_at as string,
      profiles: profile as { full_name: string; email: string } | null,
    } satisfies AuditLogEntry;
  });
}

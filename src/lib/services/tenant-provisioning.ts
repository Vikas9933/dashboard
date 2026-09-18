export const DEFAULT_AGENCY_CODE = "HQ01";
export const DEFAULT_AGENCY_NAME = "Head Office";
export const DEFAULT_TEAM_NAME = "Default Team";

type SupabaseClient = Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>;

/** Creates a default agency + team for a new client (idempotent). */
export async function provisionDefaultTenantStructure(
  supabase: SupabaseClient,
  tenantId: string,
  options?: { clientName?: string }
): Promise<{ error?: string; agencyId?: string; teamId?: string; skipped?: boolean }> {
  const { count, error: countError } = await supabase
    .from("agencies")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId);

  if (countError) {
    return { error: countError.message };
  }

  if ((count ?? 0) > 0) {
    return { skipped: true };
  }

  const agencyName =
    options?.clientName && options.clientName.trim().length > 0
      ? `${options.clientName.trim()} — ${DEFAULT_AGENCY_NAME}`
      : DEFAULT_AGENCY_NAME;

  const { data: agency, error: agencyError } = await supabase
    .from("agencies")
    .insert({
      name: agencyName,
      code: DEFAULT_AGENCY_CODE,
      tenant_id: tenantId,
      is_active: true,
    })
    .select("id")
    .single();

  if (agencyError || !agency) {
    return { error: agencyError?.message ?? "Could not create default agency." };
  }

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .insert({
      name: DEFAULT_TEAM_NAME,
      agency_id: agency.id,
      is_active: true,
    })
    .select("id")
    .single();

  if (teamError || !team) {
    return { error: teamError?.message ?? "Could not create default team." };
  }

  return { agencyId: agency.id, teamId: team.id };
}

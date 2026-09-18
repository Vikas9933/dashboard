import { logAudit } from "@/lib/audit";
import { isSuperAdmin } from "@/lib/auth/tenant";
import { uploadBatchSchema, type UploadRow } from "@/lib/schemas/upload";
import {
  canUseStorage,
  estimateUploadStorageMb,
} from "@/lib/subscriptions/enforcement";
import {
  getTenantSubscriptionContext,
  incrementOrganizationStorage,
} from "@/lib/subscriptions/context";
import { hasFeature } from "@/lib/subscriptions/features";
import type { Profile } from "@/lib/types";

export async function processAccountUpload(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  profile: Profile,
  rows: UploadRow[]
) {
  const parsed = uploadBatchSchema.safeParse(rows);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid upload data." };
  }

  const tenantId = profile.tenant_id;
  if (!tenantId && !isSuperAdmin(profile)) {
    return { error: "Tenant context required for uploads." };
  }

  if (!tenantId) {
    return { error: "Platform admin must operate within a client tenant for uploads." };
  }

  const validRows = parsed.data;

  const subscription = await getTenantSubscriptionContext(supabase, tenantId, profile);
  if (!hasFeature(subscription, "allocation_module", { bypassForSuperAdmin: true })) {
    return { error: "Upgrade your subscription plan to access portfolio data upload." };
  }

  const estimatedMb = estimateUploadStorageMb(validRows.length);
  const storageCheck = canUseStorage(subscription, estimatedMb);
  if (!storageCheck.allowed) {
    return { error: storageCheck.message ?? "Storage limit reached for your plan." };
  }

  const [{ data: agencies }, { data: teams }, { data: agents }] = await Promise.all([
    supabase.from("agencies").select("id, code").eq("is_active", true).eq("tenant_id", tenantId),
    supabase.from("teams").select("id, name, agency_id").eq("is_active", true),
    supabase
      .from("profiles")
      .select("id, email, role")
      .eq("tenant_id", tenantId)
      .in("role", ["agent", "admin"])
      .eq("is_active", true),
  ]);

  const tenantAgencyIds = new Set((agencies ?? []).map((a) => a.id));
  const tenantTeams = (teams ?? []).filter((t) => tenantAgencyIds.has(t.agency_id));

  const defaultAgency = agencies?.[0];
  const defaultTeam = tenantTeams[0];
  const defaultAgent = agents?.find((a) => a.role === "agent") ?? agents?.[0];

  if (!defaultAgency || !defaultTeam || !defaultAgent) {
    return { error: "Agency, team, and at least one agent profile are required before upload." };
  }

  const agencyByCode = new Map((agencies ?? []).map((a) => [a.code, a.id]));
  const teamByName = new Map(tenantTeams.map((t) => [t.name, { id: t.id, agency_id: t.agency_id }]));
  const agentByEmail = new Map((agents ?? []).map((a) => [a.email.toLowerCase(), a.id]));

  let inserted = 0;
  const errors: string[] = [];

  for (const row of validRows) {
    const agencyId = row.agency_code ? agencyByCode.get(row.agency_code) : defaultAgency.id;
    const teamInfo = row.team_name ? teamByName.get(row.team_name) : { id: defaultTeam.id, agency_id: defaultTeam.agency_id };
    const agentId = row.agent_email ? agentByEmail.get(row.agent_email.toLowerCase()) : defaultAgent.id;

    if (!agencyId) {
      errors.push(`${row.loan_number}: unknown agency_code`);
      continue;
    }
    if (!teamInfo) {
      errors.push(`${row.loan_number}: unknown team_name`);
      continue;
    }
    if (!agentId) {
      errors.push(`${row.loan_number}: unknown agent_email`);
      continue;
    }

    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("mobile_number", row.mobile_number)
      .maybeSingle();

    let customerId = existingCustomer?.id;

    if (!customerId) {
      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .insert({
          tenant_id: tenantId,
          customer_name: row.customer_name,
          mobile_number: row.mobile_number,
          state: row.state,
          city: row.city,
        })
        .select("id")
        .single();

      if (customerError || !customer) {
        errors.push(`${row.loan_number}: ${customerError?.message ?? "customer insert failed"}`);
        continue;
      }
      customerId = customer.id;
    }

    const { data: existingAccount } = await supabase
      .from("accounts")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("loan_number", row.loan_number)
      .maybeSingle();

    if (existingAccount) {
      errors.push(`${row.loan_number}: loan number already exists`);
      continue;
    }

    const { error: accountError } = await supabase.from("accounts").insert({
      tenant_id: tenantId,
      loan_number: row.loan_number,
      customer_id: customerId,
      agency_id: agencyId,
      team_id: teamInfo.id,
      assigned_agent_id: agentId,
      bucket: row.bucket,
      product_type: row.product_type,
      state: row.state,
      city: row.city,
      allocated_amount: row.allocated_amount,
      outstanding_amount: row.outstanding_amount,
      collected_amount: row.collected_amount,
      status: "allocated",
    });

    if (accountError) {
      errors.push(`${row.loan_number}: ${accountError.message}`);
      continue;
    }

    inserted += 1;
  }

  await logAudit({
    userId: profile.id,
    tenantId,
    action: "upload.accounts",
    entity: "accounts",
    payload: { inserted, errors: errors.length, total: validRows.length },
  });

  if (inserted === 0) {
    return { error: errors[0] ?? "Upload failed." };
  }

  await incrementOrganizationStorage(tenantId, estimatedMb);

  return {
    success: `Imported ${inserted} account(s).${errors.length ? ` ${errors.length} row(s) skipped.` : ""}`,
    errors: errors.slice(0, 10),
  };
}

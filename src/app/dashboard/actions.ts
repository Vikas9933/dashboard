"use server";

import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { requireAuth } from "@/lib/auth/session";
import { fieldVisitSchema } from "@/lib/schemas/field-visit";
import { mergeRoleScope } from "@/lib/auth/permissions";

export async function createFieldVisit(formData: FormData) {
  const { supabase, profile } = await requireAuth();

  const parsed = fieldVisitSchema.safeParse({
    accountId: String(formData.get("accountId") ?? ""),
    visitDate: String(formData.get("visitDate") ?? ""),
    customerMet: formData.get("customerMet") === "on",
    promiseToPay: formData.get("promiseToPay") === "on",
    settlementInterest: formData.get("settlementInterest") === "on",
    ptpAmount: String(formData.get("ptpAmount") ?? "").trim() || null,
    remarks: String(formData.get("remarks") ?? "").trim() || null,
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid field visit data." };
  }

  const { error } = await supabase.from("field_visits").insert({
    account_id: parsed.data.accountId,
    agent_id: profile.id,
    visit_date: parsed.data.visitDate,
    customer_met: parsed.data.customerMet,
    promise_to_pay: parsed.data.promiseToPay,
    ptp_amount: parsed.data.ptpAmount,
    settlement_interest: parsed.data.settlementInterest,
    remarks: parsed.data.remarks,
  });

  if (error) return { error: error.message };

  await supabase
    .from("accounts")
    .update({
      last_follow_up_at: new Date().toISOString(),
      latest_remark: parsed.data.remarks,
    })
    .eq("id", parsed.data.accountId);

  await logAudit({
    userId: profile.id,
    action: "field_visit.create",
    entity: "field_visits",
    entityId: parsed.data.accountId,
  });

  revalidatePath("/dashboard");
  return { success: "Field visit recorded." };
}

export async function getAccountsForFieldVisit() {
  const { supabase, profile } = await requireAuth();
  const scoped = mergeRoleScope(profile, {});

  let query = supabase
    .from("v_account_summary")
    .select("id, loan_number, customer_name, agent_name")
    .order("loan_number", { ascending: true })
    .limit(200);

  if (scoped.agencyId) query = query.eq("agency_id", scoped.agencyId);
  if (scoped.teamId) query = query.eq("team_id", scoped.teamId);
  if (scoped.agentId) query = query.eq("assigned_agent_id", scoped.agentId);

  const { data } = await query;

  return (data ?? []).map((row) => ({
    id: row.id as string,
    loanNumber: row.loan_number as string,
    customerName: row.customer_name as string,
    agentName: row.agent_name as string,
  }));
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/dashboard";
import { isSuperAdmin } from "@/lib/auth/tenant";
import { getSubscriptionPlans } from "@/app/dashboard/platform/actions";
import { getTenantSubscriptionContext } from "@/lib/subscriptions/context";

export async function getSubscriptionPageData() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const organizationId = profile.tenant_id;
  const context = await getTenantSubscriptionContext(supabase, organizationId, profile);
  const plans = await getSubscriptionPlans().catch(() => []);

  return {
    profile,
    context,
    plans,
    canManagePlan: isSuperAdmin(profile),
    canRequestUpgrade: profile.role === "admin" && !!organizationId,
    isReadOnly: ["manager", "team_leader", "agent"].includes(profile.role),
  };
}

export async function requestPlanUpgrade(formData: FormData) {
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  if (!profile?.tenant_id || profile.role !== "admin") {
    return { error: "Only Client Admins can request upgrades." };
  }

  const requestedPlan = String(formData.get("requestedPlan") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  const { logAudit } = await import("@/lib/audit");
  await logAudit({
    userId: profile.id,
    tenantId: profile.tenant_id,
    action: "config.update",
    entity: "subscription",
    payload: { requestedPlan, notes, type: "upgrade_request" },
  });

  revalidatePath("/dashboard/subscription");
  return {
    success: `Upgrade request submitted for ${requestedPlan || "a higher tier"}. Your Super Admin will review it.`,
  };
}

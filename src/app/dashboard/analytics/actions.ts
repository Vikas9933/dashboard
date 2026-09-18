"use server";

import { getSessionProfile } from "@/lib/auth/session";
import { canExport } from "@/lib/auth/permissions";
import { sendEmail } from "@/lib/email/send";
import { buildAnalyticsEmailSummary } from "@/lib/services/analytics-export-service";
import { logAudit } from "@/lib/audit";

export async function emailAnalyticsReport(
  formData: FormData
): Promise<{ success?: true; error?: string }> {
  const profile = await getSessionProfile();
  if (!profile || !canExport(profile)) {
    return { error: "You do not have permission to email reports." };
  }

  const to = String(formData.get("to") ?? "").trim();
  if (!to || !/^\S+@\S+\.\S+$/.test(to)) {
    return { error: "Enter a valid recipient email address." };
  }

  const params: Record<string, string | undefined> = {};
  formData.forEach((value, key) => {
    if (key !== "to" && typeof value === "string" && value) params[key] = value;
  });

  const { html, subject } = await buildAnalyticsEmailSummary(params);
  const result = await sendEmail({ to, subject, html });

  if ("error" in result && result.error) return { error: result.error };
  if ("skipped" in result && result.skipped) {
    return { error: "Email delivery is not configured on this server (missing RESEND_API_KEY)." };
  }

  await logAudit({
    userId: profile.id,
    action: "email.analytics_report",
    entity: "analytics",
    payload: { to },
  });

  return { success: true };
}

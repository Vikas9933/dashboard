import { getAppUrl } from "@/lib/email/config";
import { sendEmail } from "@/lib/email/send";
import {
  pendingSignupAdminEmail,
  pendingSignupUserEmail,
  unassignedSignupAdminEmail,
  userApprovedEmail,
} from "@/lib/email/templates";
import { createServiceClient, hasServiceRoleKey } from "@/lib/supabase/service";

interface PendingSignupProfile {
  id: string;
  email: string;
  full_name: string;
  tenant_id: string | null;
}

async function getClientName(tenantId: string | null) {
  if (!tenantId) return "Unassigned";

  const service = createServiceClient();
  const { data } = await service
    .from("tenants")
    .select("name")
    .eq("id", tenantId)
    .maybeSingle();

  return data?.name ?? "Your organization";
}

async function getApprovalRecipients(tenantId: string | null) {
  const service = createServiceClient();

  if (tenantId) {
    const { data: clientAdmins } = await service
      .from("profiles")
      .select("email, full_name")
      .eq("tenant_id", tenantId)
      .eq("role", "admin")
      .eq("is_active", true);

    if (clientAdmins?.length) {
      return clientAdmins;
    }
  }

  const { data: superAdmins } = await service
    .from("profiles")
    .select("email, full_name")
    .eq("role", "super_admin")
    .eq("is_active", true);

  return superAdmins ?? [];
}

async function markSignupNotified(profileId: string) {
  const service = createServiceClient();
  await service
    .from("profiles")
    .update({ signup_notified_at: new Date().toISOString() })
    .eq("id", profileId)
    .is("signup_notified_at", null);
}

export async function notifyPendingSignup(profileId: string) {
  if (!hasServiceRoleKey()) return;

  const service = createServiceClient();
  const { data: profile, error } = await service
    .from("profiles")
    .select("id, email, full_name, tenant_id, is_active, signup_notified_at, role")
    .eq("id", profileId)
    .maybeSingle();

  if (error || !profile) return;
  if (profile.role === "super_admin" || profile.is_active) return;
  if (profile.signup_notified_at) return;

  const pendingProfile = profile as PendingSignupProfile & {
    is_active: boolean;
    signup_notified_at: string | null;
    role: string;
  };

  const clientName = await getClientName(pendingProfile.tenant_id);
  const appUrl = getAppUrl();
  const adminUrl = `${appUrl}/dashboard/admin`;

  const recipients = await getApprovalRecipients(pendingProfile.tenant_id);
  const recipientEmails = recipients.map((r) => r.email).filter(Boolean);

  if (recipientEmails.length === 0) {
    console.warn("[email] No approval recipients found for pending signup:", profileId);
    return;
  }

  if (pendingProfile.tenant_id) {
    const adminTemplate = pendingSignupAdminEmail({
      newUserName: pendingProfile.full_name,
      newUserEmail: pendingProfile.email,
      clientName,
      adminUrl,
    });

    await sendEmail({
      to: recipientEmails,
      subject: adminTemplate.subject,
      html: adminTemplate.html,
      text: adminTemplate.text,
    });

    const userTemplate = pendingSignupUserEmail({
      userName: pendingProfile.full_name,
      clientName,
    });

    await sendEmail({
      to: pendingProfile.email,
      subject: userTemplate.subject,
      html: userTemplate.html,
      text: userTemplate.text,
    });
  } else {
    const adminTemplate = unassignedSignupAdminEmail({
      newUserName: pendingProfile.full_name,
      newUserEmail: pendingProfile.email,
      adminUrl,
    });

    await sendEmail({
      to: recipientEmails,
      subject: adminTemplate.subject,
      html: adminTemplate.html,
      text: adminTemplate.text,
    });
  }

  await markSignupNotified(profileId);
}

export async function notifyUserApproved(profileId: string) {
  if (!hasServiceRoleKey()) return;

  const service = createServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("email, full_name, tenant_id, is_active")
    .eq("id", profileId)
    .maybeSingle();

  if (!profile?.is_active || !profile.email) return;

  const clientName = await getClientName(profile.tenant_id);
  const loginUrl = `${getAppUrl()}/login`;
  const template = userApprovedEmail({
    userName: profile.full_name,
    clientName,
    loginUrl,
  });

  await sendEmail({
    to: profile.email,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
}

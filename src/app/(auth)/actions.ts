"use server";

import { loginSchema, registerSchema } from "@/lib/schemas/auth";
import { needsPlatformBootstrap, resolveTenantBySlug } from "@/lib/auth/signup";
import { DEFAULT_SIGNUP_TENANT_SLUG } from "@/lib/auth/signup-constants";
import { createServiceClient, hasServiceRoleKey } from "@/lib/supabase/service";

export async function validateLogin(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid login data." };
  }

  return { data: parsed.data };
}

export async function registerUser(formData: FormData) {
  const tenantSlug = String(formData.get("tenantSlug") ?? "").trim().toLowerCase();

  const parsed = registerSchema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    fullName: String(formData.get("fullName") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid registration data." };
  }

  const bootstrap = await needsPlatformBootstrap();
  const effectiveTenantSlug = tenantSlug || DEFAULT_SIGNUP_TENANT_SLUG;

  if (!bootstrap && !effectiveTenantSlug) {
    return { error: "A client sign-up link is required. Ask your administrator for the correct URL." };
  }

  if (!hasServiceRoleKey()) {
    return {
      error:
        "Registration is not configured. Add SUPABASE_SERVICE_ROLE_KEY to .env.local, or disable “Confirm email” in Supabase Auth settings.",
    };
  }

  const service = createServiceClient();

  let tenant: { id: string; name: string } | null = null;
  if (!bootstrap) {
    tenant = await resolveTenantBySlug(effectiveTenantSlug);
    if (!tenant) {
      return { error: "Invalid or inactive client account. Check your sign-up link." };
    }
  }

  if (!bootstrap && tenant) {
    const { getTenantSubscriptionContext } = await import("@/lib/subscriptions/context");
    const { canAddUser } = await import("@/lib/subscriptions/enforcement");
    const subscription = await getTenantSubscriptionContext(service, tenant.id);
    const seatCheck = canAddUser(subscription);
    if (!seatCheck.allowed) {
      return { error: seatCheck.message ?? "This organization has reached its user limit." };
    }
  }

  const userMetadata: Record<string, string> = {
    full_name: parsed.data.fullName,
  };
  if (!bootstrap && tenant) {
    userMetadata.tenant_slug = effectiveTenantSlug;
    userMetadata.tenant_id = tenant.id;
  }

  const { data: authData, error: authError } = await service.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: userMetadata,
  });

  if (authError) {
    const message = authError.message.toLowerCase().includes("database error")
      ? "We could not finish creating your account. Please try again or contact your administrator."
      : authError.message;
    return { error: message };
  }

  const newUserId = authData.user?.id;
  if (newUserId && !bootstrap && tenant) {
    const { syncOrganizationUsage } = await import("@/lib/subscriptions/context");
    void syncOrganizationUsage(tenant.id).catch((err) => {
      console.error("[signup] Failed to sync organization usage:", err);
    });

    const { notifyPendingSignup } = await import("@/lib/email/notifications");
    void notifyPendingSignup(newUserId).catch((err) => {
      console.error("[signup] Failed to send approval notification:", err);
    });
  }

  return { success: true as const };
}

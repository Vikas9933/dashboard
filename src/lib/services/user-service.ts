import { createServiceClient, hasServiceRoleKey } from "@/lib/supabase/service";
import { logAudit } from "@/lib/audit";
import { canManageRole } from "@/lib/auth/roles";
import { isSuperAdmin } from "@/lib/auth/tenant";
import { createUserSchema, updateUserSchema } from "@/lib/schemas/user";
import { canAddUser } from "@/lib/subscriptions/enforcement";
import { getTenantSubscriptionContext, syncOrganizationUsage } from "@/lib/subscriptions/context";
import type { Profile, UserRole } from "@/lib/types";

type TargetProfile = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  tenant_id: string | null;
  agency_id: string | null;
  team_id: string | null;
  is_active: boolean;
};

async function loadTargetProfile(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  profileId: string
) {
  const reader = hasServiceRoleKey() ? createServiceClient() : supabase;
  return reader
    .from("profiles")
    .select("id, email, full_name, role, tenant_id, agency_id, team_id, is_active")
    .eq("id", profileId)
    .maybeSingle();
}

function assertCanManageTarget(admin: Profile, target: TargetProfile): string | null {
  if (target.role === "super_admin") {
    return "Cannot modify a super admin account.";
  }

  if (target.id === admin.id) {
    return "You cannot modify your own account from this panel.";
  }

  if (!isSuperAdmin(admin)) {
    if (!admin.tenant_id) {
      return "Your account is not linked to a client. Contact the platform administrator.";
    }
    if (!target.tenant_id || target.tenant_id !== admin.tenant_id) {
      return "You can only manage users in your client account.";
    }
    if (target.is_active) {
      if (admin.role === "manager" && admin.agency_id && target.agency_id !== admin.agency_id) {
        return "You can only manage users in your agency.";
      }
      if (admin.role === "team_leader" && admin.team_id && target.team_id !== admin.team_id) {
        return "You can only manage users on your team.";
      }
    }
  } else if (admin.tenant_id && target.tenant_id && target.tenant_id !== admin.tenant_id) {
    return "You can only manage users in your client account.";
  }

  return null;
}

export async function createUser(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  admin: Profile,
  input: {
    email: string;
    fullName: string;
    password: string;
    role: UserRole;
    agencyId: string | null;
    teamId: string | null;
  }
) {
  if (!hasServiceRoleKey()) {
    return { error: "Set SUPABASE_SERVICE_ROLE_KEY in .env.local to create users from the admin panel." };
  }

  const tenantId = admin.tenant_id;
  if (!tenantId && !isSuperAdmin(admin)) {
    return { error: "Tenant context required to create users." };
  }

  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid user data." };
  }

  if (!canManageRole(admin, parsed.data.role)) {
    return { error: `You cannot create users with the ${parsed.data.role} role.` };
  }

  const subscription = await getTenantSubscriptionContext(supabase, tenantId, admin);
  const seatCheck = canAddUser(subscription);
  if (!seatCheck.allowed) {
    return { error: seatCheck.message ?? "User limit reached for your plan." };
  }

  const service = createServiceClient();
  const { data: authData, error: authError } = await service.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: {
      full_name: parsed.data.fullName,
      role: parsed.data.role,
      tenant_id: tenantId,
    },
  });

  if (authError) return { error: authError.message };

  const newUserId = authData.user?.id;
  if (!newUserId) return { error: "User was not created." };

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      role: parsed.data.role,
      tenant_id: tenantId,
      agency_id: parsed.data.role === "admin" ? null : parsed.data.agencyId,
      team_id: parsed.data.role === "agent" || parsed.data.role === "team_leader" ? parsed.data.teamId : null,
      is_active: true,
    })
    .eq("id", newUserId);

  if (profileError) return { error: profileError.message };

  await logAudit({
    userId: admin.id,
    tenantId,
    action: "user.create",
    entity: "profiles",
    entityId: newUserId,
    payload: { email: parsed.data.email, role: parsed.data.role },
  });

  if (tenantId) {
    await syncOrganizationUsage(tenantId);
  }

  return { success: `User ${parsed.data.email} created as ${parsed.data.role}.` };
}

export async function updateUser(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  admin: Profile,
  input: {
    profileId: string;
    role: UserRole;
    agencyId: string | null;
    teamId: string | null;
    isActive: boolean;
  }
) {
  const parsed = updateUserSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid user data." };
  }

  if (!canManageRole(admin, parsed.data.role)) {
    return { error: `You cannot assign the ${parsed.data.role} role.` };
  }

  if (parsed.data.profileId === admin.id && parsed.data.role !== admin.role) {
    return { error: "You cannot change your own role." };
  }

  const { data: target, error: targetError } = await loadTargetProfile(
    supabase,
    parsed.data.profileId
  );
  if (targetError || !target) {
    return { error: "User not found." };
  }

  const scopeError = assertCanManageTarget(admin, target as TargetProfile);
  if (scopeError) return { error: scopeError };

  const wasInactive = target.is_active === false;

  const { error } = await supabase
    .from("profiles")
    .update({
      role: parsed.data.role,
      tenant_id: admin.tenant_id ?? target.tenant_id ?? null,
      agency_id: parsed.data.role === "admin" ? null : parsed.data.agencyId,
      team_id: parsed.data.role === "agent" || parsed.data.role === "team_leader" ? parsed.data.teamId : null,
      is_active: parsed.data.isActive,
    })
    .eq("id", parsed.data.profileId);

  if (error) return { error: error.message };

  await logAudit({
    userId: admin.id,
    tenantId: admin.tenant_id,
    action: "user.update",
    entity: "profiles",
    entityId: parsed.data.profileId,
    payload: { role: parsed.data.role, isActive: parsed.data.isActive },
  });

  if (parsed.data.isActive) {
    if (wasInactive) {
      const { notifyUserApproved } = await import("@/lib/email/notifications");
      void notifyUserApproved(parsed.data.profileId).catch((err) => {
        console.error("[user.update] Failed to send approval email:", err);
      });
    }
    return { success: "User activated — they can sign in and access the dashboard." };
  }

  return { success: "User updated." };
}

export async function rejectPendingUser(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  admin: Profile,
  profileId: string
) {
  if (!hasServiceRoleKey()) {
    return {
      error: "Set SUPABASE_SERVICE_ROLE_KEY in .env.local to reject sign-up requests.",
    };
  }

  const { data: target, error: targetError } = await loadTargetProfile(supabase, profileId);
  if (targetError || !target) {
    return { error: "User not found." };
  }

  if (target.is_active) {
    return { error: "This user is already active. Deactivate them from the user list instead." };
  }

  const scopeError = assertCanManageTarget(admin, target as TargetProfile);
  if (scopeError) return { error: scopeError };

  const service = createServiceClient();
  const { error } = await service.auth.admin.deleteUser(profileId);
  if (error) return { error: error.message };

  await logAudit({
    userId: admin.id,
    tenantId: target.tenant_id,
    action: "user.reject",
    entity: "profiles",
    entityId: profileId,
    payload: { email: target.email, fullName: target.full_name },
  });

  if (target.tenant_id) {
    await syncOrganizationUsage(target.tenant_id);
  }

  return { success: `Sign-up request for ${target.email} was rejected and removed.` };
}

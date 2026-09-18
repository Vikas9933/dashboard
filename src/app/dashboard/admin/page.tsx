import { redirect } from "next/navigation";
import { AuditLogsPanel } from "@/components/admin/audit-logs";
import { TenantManagement } from "@/components/admin/tenant-management";
import { UserManagement } from "@/components/admin/user-management";
import { DataUploadPanel } from "@/components/admin/data-upload";
import { DashboardConfigPanel } from "@/components/admin/dashboard-config";
import {
  getAdminReferenceData,
  getAdminUsers,
  getAuditLogs,
  getDashboardConfig,
  getTenants,
} from "@/app/dashboard/admin/actions";
import { getCurrentProfile } from "@/lib/dashboard";
import {
  canAccessAdmin,
  canManageConfig,
  canManageTenants,
  canManageUsers,
  canUploadData,
} from "@/lib/auth/permissions";
import { isSuperAdmin } from "@/lib/auth/tenant";
import { createClient } from "@/lib/supabase/server";
import { hasOrganizationFeature } from "@/lib/subscriptions";

export default async function AdminPage() {
  const profile = await getCurrentProfile();

  if (!profile || !canAccessAdmin(profile)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const isPlatformAdmin = isSuperAdmin(profile);
  const showUsers = canManageUsers(profile);
  const showUpload = canUploadData(profile);
  const hasAuditFeature =
    isPlatformAdmin ||
    (await hasOrganizationFeature(supabase, profile.tenant_id, "audit_logs", profile));
  const hasConfigFeature =
    isPlatformAdmin ||
    (await hasOrganizationFeature(supabase, profile.tenant_id, "dashboard_customization", profile));
  const showConfig = canManageConfig(profile) && hasConfigFeature;
  const showAudit = hasAuditFeature && (isPlatformAdmin || profile.role === "admin");

  const [users, reference, config, auditLogs, tenants] = await Promise.all([
    showUsers ? getAdminUsers() : Promise.resolve([]),
    showUsers ? getAdminReferenceData() : Promise.resolve(null),
    showConfig ? getDashboardConfig() : Promise.resolve(null),
    showAudit ? getAuditLogs().catch(() => []) : Promise.resolve([]),
    isPlatformAdmin && canManageTenants(profile) ? getTenants().catch(() => []) : Promise.resolve([]),
  ]);

  const roleTitles: Record<string, string> = {
    super_admin: "Admin Module",
    admin: "Client Admin Module",
    manager: "Supervisor Module",
    team_leader: "Team Leader Module",
  };

  const roleDescriptions: Record<string, string> = {
    super_admin:
      "Platform-wide access: client accounts, users, uploads, configuration, and audit logs.",
    admin:
      "Manage supervisors, settings, portfolio data, uploads, and full reports for your client.",
    manager: "Manage team leaders, allocations, and operational reports for your agency.",
    team_leader: "Manage agents and monitor team PTPs, collections, and productivity.",
  };

  return (
    <div className="space-y-8">
      <div className="dash-glass dash-hero-glow rounded-2xl px-5 py-4">
        <h2 className="text-lg font-bold text-white">
          {roleTitles[profile.role] ?? "Admin Module"}
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          {roleDescriptions[profile.role] ??
            "User management and operational tools for your scope."}
        </p>
      </div>

      {isPlatformAdmin && canManageTenants(profile) && (
        <section>
          <h3 className="dash-section-title mb-4">Client Accounts</h3>
          <TenantManagement tenants={tenants} />
        </section>
      )}

      {showUsers && reference && (
        <section>
          <h3 className="dash-section-title mb-4">User Management & Approvals</h3>
          <UserManagement
            users={users}
            agencies={reference.agencies}
            teams={reference.teams}
            tenants={reference.tenants}
            hasServiceRole={reference.hasServiceRole}
            isSuperAdmin={reference.isSuperAdmin}
            actorRole={profile.role}
          />
        </section>
      )}

      {showUpload && (
        <section>
          <h3 className="dash-section-title mb-4">Data Upload</h3>
          <DataUploadPanel />
        </section>
      )}

      {showConfig && config && (
        <section>
          <h3 className="dash-section-title mb-4">Dashboard Configuration</h3>
          <DashboardConfigPanel config={config} />
        </section>
      )}

      {showAudit && (
        <section>
          <h3 className="dash-section-title mb-4">Audit Logs</h3>
          <AuditLogsPanel logs={auditLogs} />
        </section>
      )}
    </div>
  );
}

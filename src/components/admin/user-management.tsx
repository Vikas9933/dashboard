"use client";

import { useMemo, useState, useTransition } from "react";
import { CheckCircle2, Clock, Loader2, Plus, Shield, UserCheck, UserX } from "lucide-react";
import { createAdminUser, rejectSignupRequest, updateUserRole } from "@/app/dashboard/admin/actions";
import { creatableRoles } from "@/lib/auth/roles";
import { formatRole, formatDateTime } from "@/lib/format";
import type { AdminUserRow, UserRole } from "@/lib/types";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

interface UserManagementProps {
  users: AdminUserRow[];
  agencies: { id: string; name: string }[];
  teams: { id: string; name: string; agency_id: string }[];
  tenants?: { id: string; name: string; slug: string }[];
  hasServiceRole: boolean;
  isSuperAdmin?: boolean;
  actorRole: UserRole;
}

const selectClass = "dash-input px-2 py-1.5 text-sm";

function agencyName(agencies: UserManagementProps["agencies"], id: string | null) {
  if (!id) return "—";
  return agencies.find((a) => a.id === id)?.name ?? "—";
}

function teamName(teams: UserManagementProps["teams"], id: string | null) {
  if (!id) return "—";
  return teams.find((t) => t.id === id)?.name ?? "—";
}

function clientName(tenants: UserManagementProps["tenants"], tenantId: string | null) {
  if (!tenantId) return "Unassigned — no client";
  return tenants?.find((t) => t.id === tenantId)?.name ?? "Unknown client";
}

export function UserManagement({
  users,
  agencies,
  teams,
  tenants = [],
  hasServiceRole,
  isSuperAdmin = false,
  actorRole,
}: UserManagementProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const assignableRoles = useMemo(() => creatableRoles(actorRole), [actorRole]);

  const pendingUsers = useMemo(() => users.filter((u) => !u.is_active), [users]);
  const activeUsers = useMemo(() => users.filter((u) => u.is_active), [users]);

  function handleCreate(formData: FormData) {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await createAdminUser(formData);
      if (result.error) setError(result.error);
      else if (result.success) setMessage(result.success);
    });
  }

  function handleReject(profileId: string, email: string) {
    const confirmed = window.confirm(
      `Reject the sign-up request for ${email}?\n\nTheir account will be removed and they will need to register again.`
    );
    if (!confirmed) return;

    setMessage(null);
    setError(null);
    const formData = new FormData();
    formData.set("profileId", profileId);
    startTransition(async () => {
      const result = await rejectSignupRequest(formData);
      if (result.error) setError(result.error);
      else if (result.success) setMessage(result.success);
    });
  }

  function handleUpdate(formData: FormData, activate = false) {
    setMessage(null);
    setError(null);
    if (activate) {
      formData.set("isActive", "true");
    }
    startTransition(async () => {
      const result = await updateUserRole(formData);
      if (result.error) setError(result.error);
      else if (result.success) setMessage(result.success);
    });
  }

  return (
    <div className="space-y-6">
      {!hasServiceRole && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          Add <code className="rounded bg-amber-500/20 px-1">SUPABASE_SERVICE_ROLE_KEY</code> to{" "}
          <code className="rounded bg-amber-500/20 px-1">.env.local</code> to enable creating new users
          from this panel. Rejecting sign-up requests also requires it.
        </div>
      )}

      {(message || error) && (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            error
              ? "border border-rose-500/30 bg-rose-500/10 text-rose-300"
              : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          }`}
        >
          {error ?? message}
        </div>
      )}

      {/* Pending approvals — users waiting for admin to grant access */}
      <Card className="border border-amber-500/20 bg-amber-500/[0.04]" variant="glass">
        <CardBody>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-400" />
              <div>
                <h3 className="font-semibold text-white">Pending approvals</h3>
                <p className="text-sm text-slate-400">
                  New sign-ups waiting for role, agency, team, and activation
                </p>
              </div>
            </div>
            <span className="rounded-full border border-amber-500/30 bg-amber-500/15 px-3 py-1 text-sm font-semibold text-amber-300">
              {pendingUsers.length} waiting
            </span>
          </div>

          {pendingUsers.length === 0 ? (
            <p className="rounded-xl border border-dashed border-amber-500/20 bg-white/[0.02] px-4 py-6 text-center text-sm text-slate-500">
              No users waiting for approval.
            </p>
          ) : (
            <div className="space-y-4">
              {pendingUsers.map((user) => (
                <div key={user.id} className="dash-clay rounded-xl p-4">
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-white">{user.full_name}</p>
                      <p className="text-sm text-slate-400">{user.email}</p>
                      {isSuperAdmin && (
                        <p className="mt-1 text-sm font-medium text-[#00F2FE]">
                          Client: {clientName(tenants, user.tenant_id)}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-amber-400">
                        Registered {formatDateTime(user.created_at)}
                      </p>
                    </div>
                    <span className="rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-300">
                      Inactive — cannot sign in to dashboard
                    </span>
                  </div>

                  <form
                    action={(fd) => handleUpdate(fd, true)}
                    className="flex flex-wrap items-end gap-2"
                  >
                    <input type="hidden" name="profileId" value={user.id} />
                    <input type="hidden" name="isActive" value="true" />

                    <label className="flex flex-col gap-1 text-xs text-slate-500">
                      Role
                      <select
                        name="role"
                        defaultValue={user.role === "admin" ? "agent" : user.role}
                        required
                        className={selectClass}
                      >
                        {assignableRoles
                          .filter((r) => r !== "admin")
                          .map((role) => (
                            <option key={role} value={role}>
                              {formatRole(role)}
                            </option>
                          ))}
                      </select>
                    </label>

                    <label className="flex flex-col gap-1 text-xs text-slate-500">
                      Agency
                      <select
                        name="agencyId"
                        defaultValue={user.agency_id ?? ""}
                        required
                        className={selectClass}
                      >
                        <option value="" disabled>
                          Select agency
                        </option>
                        {agencies.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="flex flex-col gap-1 text-xs text-slate-500">
                      Team
                      <select name="teamId" defaultValue={user.team_id ?? ""} className={selectClass}>
                        <option value="">No team (supervisors only)</option>
                        {teams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <button
                      type="submit"
                      disabled={isPending}
                      className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/25 disabled:opacity-50"
                    >
                      {isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <UserCheck className="h-4 w-4" />
                      )}
                      Approve & grant access
                    </button>

                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleReject(user.id, user.email)}
                      className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50"
                    >
                      {isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <UserX className="h-4 w-4" />
                      )}
                      Reject request
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Card variant="glass">
        <CardBody>
          <div className="mb-4 flex items-center gap-2">
            <Plus className="h-4 w-4 text-[#00F2FE]" />
            <h3 className="font-semibold text-white">Create user (pre-approved)</h3>
          </div>
          <p className="mb-4 text-sm text-slate-400">
            {isSuperAdmin
              ? "Select a client, then create an active user for that client."
              : "Creates an active user immediately — no pending approval step."}
          </p>
          <form action={handleCreate} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {isSuperAdmin && (
              <select name="tenantId" required className="dash-input md:col-span-2 xl:col-span-3">
                <option value="">Select client account</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.slug})
                  </option>
                ))}
              </select>
            )}
            <input name="fullName" required placeholder="Full name" className="dash-input" />
            <input name="email" type="email" required placeholder="Email" className="dash-input" />
            <input
              name="password"
              type="password"
              required
              minLength={6}
              placeholder="Password (6+ chars)"
              className="dash-input"
            />
            <select name="role" defaultValue="agent" className="dash-input">
              {assignableRoles.map((role) => (
                <option key={role} value={role}>
                  {formatRole(role)}
                </option>
              ))}
            </select>
            <select name="agencyId" className="dash-input">
              <option value="">Select agency</option>
              {agencies.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <select name="teamId" className="dash-input">
              <option value="">Select team</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={isPending || !hasServiceRole || (isSuperAdmin && tenants.length === 0)}
              className="dash-btn-primary flex items-center justify-center gap-2 disabled:opacity-50 md:col-span-2 xl:col-span-3"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create user
            </button>
          </form>
        </CardBody>
      </Card>

      <Card variant="glass">
        <CardHeader variant="glass">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#00F2FE]" />
            <div>
              <h3 className="font-semibold text-white">All users</h3>
              <p className="text-sm text-slate-400">
                {activeUsers.length} active · {pendingUsers.length} pending
              </p>
            </div>
          </div>
        </CardHeader>
        <CardBody className="overflow-x-auto p-0">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02] text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Agency</th>
                <th className="px-4 py-3 font-medium">Team</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                    No users yet
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-white/[0.03] align-top transition hover:bg-[#00F2FE]/5"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{user.full_name}</div>
                      <div className="text-xs text-slate-500">{user.email}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{formatRole(user.role)}</td>
                    <td className="px-4 py-3 text-slate-400">
                      {agencyName(agencies, user.agency_id)}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{teamName(teams, user.team_id)}</td>
                    <td className="px-4 py-3">
                      {user.is_active ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400">
                          <Clock className="h-3 w-3" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <form action={(fd) => handleUpdate(fd)} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="profileId" value={user.id} />
                        <select name="role" defaultValue={user.role} className={selectClass}>
                          {assignableRoles.map((role) => (
                            <option key={role} value={role}>
                              {formatRole(role)}
                            </option>
                          ))}
                        </select>
                        <select name="agencyId" defaultValue={user.agency_id ?? ""} className={selectClass}>
                          <option value="">No agency</option>
                          {agencies.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                        </select>
                        <select name="teamId" defaultValue={user.team_id ?? ""} className={selectClass}>
                          <option value="">No team</option>
                          {teams.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                        <select
                          name="isActive"
                          defaultValue={user.is_active ? "true" : "false"}
                          className={selectClass}
                        >
                          <option value="true">Active</option>
                          <option value="false">Inactive</option>
                        </select>
                        <button
                          type="submit"
                          disabled={isPending}
                          className="rounded-xl border border-[#00F2FE]/30 bg-[#00F2FE]/10 px-3 py-1.5 text-xs font-semibold text-[#00F2FE] transition hover:bg-[#00F2FE]/20 disabled:opacity-50"
                        >
                          Save
                        </button>
                      </form>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}

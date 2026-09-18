"use client";

import { useState, useTransition } from "react";
import {
  Activity,
  Building2,
  Copy,
  CreditCard,
  Gauge,
  Loader2,
  Plus,
  Shield,
  ToggleLeft,
  Trash2,
} from "lucide-react";
import {
  createPlatformTenant,
  removePlatformTenant,
  setTenantActive,
  updateTenantLimits,
  updateTenantPlan,
} from "@/app/dashboard/platform/actions";
import type { AuditLogEntry } from "@/lib/services/audit-service";
import { formatDateTime } from "@/lib/format";
import {
  planTierBadgeClass,
  sortSubscriptionPlans,
  SUBSCRIPTION_FEATURE_KEYS,
} from "@/lib/subscriptions/plans";
import type { SubscriptionPlan, Tenant, TenantUsageRow } from "@/lib/types";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

const orderedPlans = (plans: SubscriptionPlan[]) => sortSubscriptionPlans(plans);

export function PlatformManagement({
  tenants,
  plans,
  usage,
  activity,
}: {
  tenants: Tenant[];
  plans: SubscriptionPlan[];
  usage: TenantUsageRow[];
  activity: AuditLogEntry[];
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<{ error?: string; success?: string }>) {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
      else if (result.success) setMessage(result.success);
    });
  }

  function copySignupLink(slug: string) {
    void navigator.clipboard.writeText(`${window.location.origin}/signup?tenant=${slug}`);
    setMessage(`Copied sign-up link for ${slug}`);
  }

  function handleDeleteTenant(tenantId: string, tenantName: string, slug: string) {
    if (slug === "default") return;
    const confirmed = window.confirm(
      `Permanently delete "${tenantName}"?\n\nThis removes all portfolio data and deletes every user linked to this client. This cannot be undone.`
    );
    if (!confirmed) return;

    const formData = new FormData();
    formData.set("tenantId", tenantId);
    run(async () => removePlatformTenant(formData));
  }

  const tierPlans = orderedPlans(plans);

  return (
    <div className="space-y-10">
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

      {/* Create clients */}
      <Card variant="hero">
        <CardBody>
          <div className="mb-4 flex items-center gap-2">
            <Plus className="h-4 w-4 text-[#00F2FE]" />
            <h3 className="font-semibold text-white">Create client</h3>
          </div>
          <form action={(fd) => run(() => createPlatformTenant(fd))} className="flex flex-wrap gap-3">
            <input name="name" required placeholder="Client name" className="dash-input min-w-[200px] flex-1" />
            <input
              name="slug"
              required
              placeholder="slug"
              pattern="[a-z0-9-]+"
              className="dash-input min-w-[160px]"
            />
            <select name="planId" defaultValue="" className="dash-input">
              <option value="">Standard (default)</option>
              {tierPlans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button type="submit" disabled={isPending} className="dash-btn-primary disabled:opacity-50">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
            </button>
          </form>
        </CardBody>
      </Card>

      {/* Clients list */}
      <Card variant="glass">
        <CardHeader variant="glass">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-[#00F2FE]" />
            <h3 className="font-semibold text-white">Clients ({tenants.length})</h3>
          </div>
        </CardHeader>
        <CardBody className="overflow-x-auto p-0">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02] text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => {
                const plan = tierPlans.find((p) => p.id === tenant.subscription_plan_id);
                return (
                  <tr
                    key={tenant.id}
                    className="border-b border-white/[0.03] align-top transition hover:bg-[#00F2FE]/5"
                  >
                    <td className="px-4 py-4">
                      <p className="font-medium text-white">{tenant.name}</p>
                      <p className="text-xs text-slate-500">{tenant.slug}</p>
                      {plan && (
                        <span
                          className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${planTierBadgeClass(plan.code)}`}
                        >
                          {plan.name}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => copySignupLink(tenant.slug)}
                        className="mt-1 flex items-center gap-1 text-xs text-[#00F2FE] hover:text-white"
                      >
                        <Copy className="h-3 w-3" /> Copy sign-up link
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <form
                        action={(fd) => run(() => updateTenantPlan(fd))}
                        className="flex items-center gap-2"
                      >
                        <input type="hidden" name="tenantId" value={tenant.id} />
                        <select
                          name="planId"
                          defaultValue={tenant.subscription_plan_id ?? ""}
                          className="dash-input px-2 py-1 text-xs"
                        >
                          {tierPlans.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                        <button type="submit" disabled={isPending} className="text-xs text-[#00F2FE] hover:text-white">
                          Save
                        </button>
                      </form>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
                          tenant.is_active
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                            : "border-white/10 bg-white/5 text-slate-400"
                        }`}
                      >
                        {tenant.is_active ? "Active" : "Inactive"}
                      </span>
                      <form action={(fd) => run(() => setTenantActive(fd))} className="mt-2">
                        <input type="hidden" name="tenantId" value={tenant.id} />
                        <input
                          type="hidden"
                          name="isActive"
                          value={tenant.is_active ? "false" : "true"}
                        />
                        <button
                          type="submit"
                          disabled={isPending}
                          className="text-xs font-medium text-slate-400 hover:text-[#00F2FE]"
                        >
                          {tenant.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </form>
                      <button
                        type="button"
                        disabled={isPending || tenant.slug === "default"}
                        onClick={() => handleDeleteTenant(tenant.id, tenant.name, tenant.slug)}
                        className="mt-2 flex items-center gap-1 text-xs font-medium text-rose-400 hover:text-rose-300 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete client
                      </button>
                    </td>
                    <td className="space-y-3 px-4 py-4">
                      <p className="text-xs text-slate-500">
                        Plan limits apply. Per-feature access will be configured when tier features
                        are defined.
                      </p>
                      <form
                        action={(fd) => run(() => updateTenantLimits(fd))}
                        className="flex flex-wrap items-end gap-2 border-t border-white/5 pt-2"
                      >
                        <input type="hidden" name="tenantId" value={tenant.id} />
                        <label className="text-xs text-slate-500">
                          Max users
                          <input
                            name="maxUsers"
                            type="number"
                            min={1}
                            defaultValue={tenant.max_users ?? plan?.max_users ?? 10}
                            className="dash-input ml-1 w-16 px-1 py-0.5"
                          />
                        </label>
                        <label className="text-xs text-slate-500">
                          Storage MB
                          <input
                            name="maxStorageMb"
                            type="number"
                            min={64}
                            defaultValue={tenant.max_storage_mb ?? plan?.max_storage_mb ?? 512}
                            className="dash-input ml-1 w-20 px-1 py-0.5"
                          />
                        </label>
                        <button type="submit" disabled={isPending} className="text-xs text-[#00F2FE] hover:text-white">
                          Save limits
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardBody>
      </Card>

      {/* Subscription plans */}
      <Card variant="glass">
        <CardBody>
          <div className="mb-2 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-[#00F2FE]" />
            <h3 className="font-semibold text-white">Subscription tiers</h3>
          </div>
          <p className="mb-4 text-sm text-slate-400">
            Standard, Pro, and Enterprise plans are active. Feature bundles per tier will be added
            when you define them — limits below can be adjusted anytime.
          </p>
          <div className="grid gap-4 lg:grid-cols-3">
            {tierPlans.map((plan) => (
              <div key={plan.id} className={`dash-clay rounded-xl border p-5 ${planTierBadgeClass(plan.code)}`}>
                <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{plan.code}</p>
                <p className="mt-1 text-lg font-bold text-white">{plan.name}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{plan.description}</p>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-400">User seats</dt>
                    <dd className="font-semibold text-white">{plan.max_users}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-400">Storage</dt>
                    <dd className="font-semibold text-white">{plan.max_storage_mb} MB</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-400">Features</dt>
                    <dd className="font-medium text-white">
                      {SUBSCRIPTION_FEATURE_KEYS.length > 0
                        ? `${SUBSCRIPTION_FEATURE_KEYS.length} configured`
                        : "To be configured"}
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Usage monitoring */}
      <Card variant="glass">
        <CardHeader variant="glass">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-[#00F2FE]" />
            <h3 className="font-semibold text-white">Client usage</h3>
          </div>
        </CardHeader>
        <CardBody className="overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02] text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Users</th>
                <th className="px-4 py-3">Accounts</th>
                <th className="px-4 py-3">Storage</th>
              </tr>
            </thead>
            <tbody>
              {usage.map((row) => (
                <tr key={row.tenant_id} className="border-b border-white/[0.03] transition hover:bg-[#00F2FE]/5">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{row.tenant_name}</p>
                    <p className="text-xs text-slate-500">{row.plan_name ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {row.user_count} / {row.max_users}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{row.account_count}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {row.storage_used_mb} / {row.max_storage_mb} MB
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      {/* System activity */}
      <Card variant="glass">
        <CardHeader variant="glass">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[#00F2FE]" />
            <h3 className="font-semibold text-white">System activity</h3>
          </div>
        </CardHeader>
        <div className="max-h-80 overflow-y-auto">
          {activity.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500">No activity recorded yet.</p>
          ) : (
            <ul className="divide-y divide-white/[0.03]">
              {activity.map((log) => (
                <li key={log.id} className="px-5 py-3 text-sm">
                  <span className="font-medium text-white">{log.action}</span>
                  <span className="text-slate-500"> · {log.entity}</span>
                  <p className="text-xs text-slate-500">{formatDateTime(log.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <p className="flex items-center gap-2 text-xs text-slate-500">
        <Shield className="h-3.5 w-3.5" />
        <ToggleLeft className="h-3.5 w-3.5" />
        Super Admin controls clients, subscription tiers, usage limits, and platform activity.
      </p>
    </div>
  );
}

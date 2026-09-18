"use client";

import { useState, useTransition } from "react";
import { Building2, Copy, Loader2, Plus, Trash2 } from "lucide-react";
import { createTenant, deactivateTenant, removeTenant } from "@/app/dashboard/admin/actions";
import type { Tenant } from "@/lib/types";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

export function TenantManagement({ tenants }: { tenants: Tenant[] }) {
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

  function handleCreate(formData: FormData) {
    run(async () => createTenant(formData));
  }

  function handleDelete(tenantId: string, tenantName: string, slug: string) {
    if (slug === "default") return;
    const confirmed = window.confirm(
      `Permanently delete "${tenantName}"?\n\nThis removes all portfolio data and deletes every user linked to this client. This cannot be undone.`
    );
    if (!confirmed) return;

    const formData = new FormData();
    formData.set("tenantId", tenantId);
    run(async () => removeTenant(formData));
  }

  function copySignupLink(slug: string) {
    const url = `${window.location.origin}/signup?tenant=${slug}`;
    void navigator.clipboard.writeText(url);
    setMessage(`Copied sign-up link for ${slug}`);
  }

  return (
    <div className="space-y-6">
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

      <Card variant="hero">
        <CardBody>
          <div className="mb-4 flex items-center gap-2">
            <Plus className="h-4 w-4 text-[#00F2FE]" />
            <h3 className="font-semibold text-white">Create client account</h3>
          </div>
          <p className="mb-4 text-sm text-slate-400">
            Each client gets isolated data. Users sign up with a client-specific link.
          </p>
          <form action={handleCreate} className="flex flex-wrap gap-3">
            <input
              name="name"
              required
              placeholder="Client name (e.g. Acme Collections)"
              className="dash-input min-w-[220px] flex-1"
            />
            <input
              name="slug"
              required
              placeholder="slug (e.g. acme-collections)"
              pattern="[a-z0-9-]+"
              className="dash-input min-w-[180px]"
            />
            <button type="submit" disabled={isPending} className="dash-btn-primary inline-flex items-center gap-2">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create client
            </button>
          </form>
        </CardBody>
      </Card>

      <Card variant="glass">
        <CardHeader variant="glass">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-[#00F2FE]" />
            <h3 className="font-semibold text-white">Client accounts ({tenants.length})</h3>
          </div>
        </CardHeader>
        <CardBody className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02] text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Sign-up link</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                    No clients yet. Create one above.
                  </td>
                </tr>
              ) : (
                tenants.map((tenant) => (
                  <tr
                    key={tenant.id}
                    className="border-b border-white/[0.03] transition hover:bg-[#00F2FE]/5"
                  >
                    <td className="px-4 py-3 font-medium text-white">{tenant.name}</td>
                    <td className="px-4 py-3 text-slate-400">{tenant.slug}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                          tenant.is_active
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                            : "border-white/10 bg-white/5 text-slate-400"
                        }`}
                      >
                        {tenant.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => copySignupLink(tenant.slug)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#00F2FE] hover:text-white"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        /signup?tenant={tenant.slug}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <form action={(fd) => run(async () => deactivateTenant(fd))}>
                          <input type="hidden" name="tenantId" value={tenant.id} />
                          <input
                            type="hidden"
                            name="isActive"
                            value={tenant.is_active ? "false" : "true"}
                          />
                          <button
                            type="submit"
                            disabled={isPending || tenant.slug === "default"}
                            className="text-xs font-medium text-slate-400 hover:text-[#00F2FE] disabled:opacity-50"
                          >
                            {tenant.is_active ? "Deactivate" : "Activate"}
                          </button>
                        </form>
                        <button
                          type="button"
                          disabled={isPending || tenant.slug === "default"}
                          onClick={() => handleDelete(tenant.id, tenant.name, tenant.slug)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-rose-400 hover:text-rose-300 disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
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

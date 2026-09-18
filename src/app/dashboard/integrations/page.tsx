import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/dashboard";
import { UpgradeGate } from "@/components/subscription/upgrade-gate";
import { requireFeature } from "@/lib/subscriptions/guard";

export const metadata = {
  title: "API & Integrations | Collection & Recovery Dashboard",
};

export default async function IntegrationsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();

  try {
    await requireFeature(supabase, profile, "api_integration");
  } catch {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <UpgradeGate featureKey="api_integration" title="Enterprise plan required" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">API & integrations</h2>
        <p className="mt-1 text-sm text-slate-500">
          Enterprise-tier API keys, CRM connectors, and collection system integrations.
        </p>
      </div>
      <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-6">
        <p className="font-semibold text-violet-900">Ready for Stripe / Razorpay billing hooks</p>
        <p className="mt-2 text-sm text-violet-800">
          This module is gated by <code className="rounded bg-white/80 px-1">api_integration</code>.
          Wire your REST keys and third-party CRM endpoints here without changing the core dashboard.
        </p>
      </div>
    </div>
  );
}

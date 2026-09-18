import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/dashboard";
import { UpgradeGate } from "@/components/subscription/upgrade-gate";
import { requireFeature } from "@/lib/subscriptions/guard";

export const metadata = {
  title: "Webhooks | Collection & Recovery Dashboard",
};

export default async function WebhooksPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();

  try {
    await requireFeature(supabase, profile, "webhooks");
  } catch {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <UpgradeGate featureKey="webhooks" title="Enterprise plan required" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Webhooks</h2>
        <p className="mt-1 text-sm text-slate-500">
          Enterprise webhook endpoints for real-time event delivery to external systems.
        </p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">
          Configure outbound webhooks for collections, settlements, and user lifecycle events.
          Server-side access validated via <code className="rounded bg-slate-100 px-1">hasFeature(orgId, &quot;webhooks&quot;)</code>.
        </p>
      </div>
    </div>
  );
}

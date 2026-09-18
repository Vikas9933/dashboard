import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getCurrentProfile } from "@/lib/dashboard";
import { getDashboardConfig } from "@/app/dashboard/admin/actions";
import { createClient } from "@/lib/supabase/server";
import { getTenantSubscriptionContext } from "@/lib/subscriptions/context";
import { hasFeature, SUBSCRIPTION_FEATURE_KEYS } from "@/lib/subscriptions/features";
import type { SubscriptionFeatureKey } from "@/lib/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  if (!profile.is_active) {
    redirect("/pending-approval");
  }

  const supabase = await createClient();
  const [config, subscriptionContext] = await Promise.all([
    getDashboardConfig(),
    getTenantSubscriptionContext(supabase, profile.tenant_id, profile),
  ]);

  const enabledFeatures = SUBSCRIPTION_FEATURE_KEYS.reduce(
    (acc, key) => {
      acc[key] = hasFeature(subscriptionContext, key, { bypassForSuperAdmin: true });
      return acc;
    },
    {} as Record<SubscriptionFeatureKey, boolean>
  );

  return (
    <DashboardShell
      profile={profile}
      config={config}
      enabledFeatures={enabledFeatures}
      subscriptionContext={subscriptionContext}
    >
      {children}
    </DashboardShell>
  );
}

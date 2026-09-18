import type { Profile, SubscriptionFeatureKey } from "@/lib/types";
import { getTenantSubscriptionContext } from "./context";
import { hasFeature, upgradeMessage } from "./features";

type SupabaseClient = Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>;

export class SubscriptionFeatureError extends Error {
  featureKey: SubscriptionFeatureKey;
  requiredPlan: string;

  constructor(featureKey: SubscriptionFeatureKey, message: string, requiredPlan: string) {
    super(message);
    this.name = "SubscriptionFeatureError";
    this.featureKey = featureKey;
    this.requiredPlan = requiredPlan;
  }
}

export async function requireFeature(
  supabase: SupabaseClient,
  profile: Profile,
  featureKey: SubscriptionFeatureKey
) {
  const context = await getTenantSubscriptionContext(supabase, profile.tenant_id, profile);
  if (hasFeature(context, featureKey, { bypassForSuperAdmin: true })) {
    return context;
  }
  throw new SubscriptionFeatureError(
    featureKey,
    upgradeMessage(featureKey),
    context?.planName ?? "Pro"
  );
}

export async function checkFeature(
  supabase: SupabaseClient,
  profile: Profile,
  featureKey: SubscriptionFeatureKey
) {
  const context = await getTenantSubscriptionContext(supabase, profile.tenant_id, profile);
  return {
    context,
    allowed: hasFeature(context, featureKey, { bypassForSuperAdmin: true }),
    message: upgradeMessage(featureKey),
  };
}

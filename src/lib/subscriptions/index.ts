export {
  FEATURE_LABELS,
  FEATURE_MIN_PLAN,
  SUBSCRIPTION_FEATURE_KEYS,
  featuresForPlanCode,
  hasFeature,
  isPlanStatusActive,
  mergeFeatureFlags,
  planMeetsMinimum,
  requiredPlanForFeature,
  upgradeMessage,
} from "./features";
export {
  getTenantSubscriptionContext,
  incrementOrganizationStorage,
  syncOrganizationUsage,
  type OrganizationId,
} from "./context";
export { canAddUser, canUseStorage, estimateUploadStorageMb } from "./enforcement";
export { checkFeature, requireFeature, SubscriptionFeatureError } from "./guard";
export {
  DEFAULT_SUBSCRIPTION_PLAN_CODE,
  SUBSCRIPTION_PLAN_CODES,
  SUBSCRIPTION_PLAN_DEFAULTS,
  SUBSCRIPTION_PLAN_ORDER,
  planTierBadgeClass,
  planTierLabel,
  sortSubscriptionPlans,
} from "./plans";

/** Convenience: load context then evaluate feature (server-side). */
export async function hasOrganizationFeature(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  organizationId: string | null,
  featureKey: import("@/lib/types").SubscriptionFeatureKey,
  profile?: import("@/lib/types").Profile | null
) {
  const { getTenantSubscriptionContext } = await import("./context");
  const { hasFeature: check } = await import("./features");
  const context = await getTenantSubscriptionContext(supabase, organizationId, profile);
  return check(context, featureKey, { bypassForSuperAdmin: true });
}

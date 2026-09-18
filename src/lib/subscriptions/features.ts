import type { PlanStatus, SubscriptionFeatureKey, TenantSubscriptionContext } from "@/lib/types";
import { isSubscriptionPlanCode, SUBSCRIPTION_PLAN_DEFAULTS, type SubscriptionPlanCode } from "./plans";

/** Minimum plan required for each feature (cumulative tiers). */
export const FEATURE_MIN_PLAN: Record<SubscriptionFeatureKey, SubscriptionPlanCode> = {
  user_management: "standard",
  dashboard: "standard",
  customer_management: "standard",
  allocation_module: "standard",
  ptp_tracking: "standard",
  collection_tracking: "standard",
  basic_reports: "standard",
  excel_export: "standard",
  search_filters: "standard",
  advanced_analytics: "pro",
  target_vs_achievement: "pro",
  supervisor_performance: "pro",
  team_leader_performance: "pro",
  agent_performance: "pro",
  settlement_tracking: "pro",
  agency_performance: "pro",
  audit_logs: "pro",
  advanced_filters: "pro",
  dashboard_customization: "pro",
  email_notifications: "pro",
  whatsapp_integration: "pro",
  api_integration: "enterprise",
  crm_integration: "enterprise",
  collection_system_integration: "enterprise",
  auto_data_sync: "enterprise",
  webhooks: "enterprise",
  custom_workflows: "enterprise",
  white_label: "enterprise",
  dedicated_database: "enterprise",
  custom_reports_modules: "enterprise",
};

export const SUBSCRIPTION_FEATURE_KEYS = Object.keys(FEATURE_MIN_PLAN) as SubscriptionFeatureKey[];

const PLAN_RANK: Record<SubscriptionPlanCode, number> = {
  standard: 1,
  pro: 2,
  enterprise: 3,
};

export const FEATURE_LABELS: Record<SubscriptionFeatureKey, string> = {
  user_management: "User Management",
  dashboard: "Dashboard",
  customer_management: "Customer Management",
  allocation_module: "Allocation Module",
  ptp_tracking: "PTP Tracking",
  collection_tracking: "Collection Tracking",
  basic_reports: "Basic Reports",
  excel_export: "Excel Export",
  search_filters: "Search & Filters",
  advanced_analytics: "Advanced Analytics",
  target_vs_achievement: "Target vs Achievement Dashboard",
  supervisor_performance: "Supervisor Performance Tracking",
  team_leader_performance: "Team Leader Performance Tracking",
  agent_performance: "Agent Performance Tracking",
  settlement_tracking: "Settlement Tracking",
  agency_performance: "Agency Performance Monitoring",
  audit_logs: "Audit Logs",
  advanced_filters: "Advanced Filters",
  dashboard_customization: "Dashboard Customization",
  email_notifications: "Email Notifications",
  whatsapp_integration: "WhatsApp Integration",
  api_integration: "API Integration",
  crm_integration: "Third-Party CRM Integration",
  collection_system_integration: "Collection System Integration",
  auto_data_sync: "Auto Data Sync",
  webhooks: "Webhook Support",
  custom_workflows: "Custom Workflows",
  white_label: "White Label Branding",
  dedicated_database: "Dedicated Database Option",
  custom_reports_modules: "Custom Reports & Modules",
};

const ACTIVE_PLAN_STATUSES: PlanStatus[] = ["active", "trial"];

export function isPlanStatusActive(status: PlanStatus): boolean {
  return ACTIVE_PLAN_STATUSES.includes(status);
}

export function mergeFeatureFlags(
  planFeatures: Record<string, boolean> | null | undefined,
  tenantOverrides: Record<string, boolean> | null | undefined
): Record<string, boolean> {
  return { ...(planFeatures ?? {}), ...(tenantOverrides ?? {}) };
}

export function planMeetsMinimum(planCode: string, minimum: SubscriptionPlanCode): boolean {
  if (!isSubscriptionPlanCode(planCode)) return false;
  return PLAN_RANK[planCode] >= PLAN_RANK[minimum];
}

/** Server-side feature check using loaded subscription context. */
export function hasFeature(
  context: TenantSubscriptionContext | null,
  featureKey: SubscriptionFeatureKey,
  options?: { bypassForSuperAdmin?: boolean }
): boolean {
  if (!context) return false;
  if (options?.bypassForSuperAdmin && context.isSuperAdmin) return true;
  if (!context.organizationId) return context.isSuperAdmin;
  if (!isPlanStatusActive(context.planStatus)) return false;

  const merged = mergeFeatureFlags(context.planFeatures, context.featureOverrides);
  if (featureKey in merged) {
    return merged[featureKey] === true;
  }

  return planMeetsMinimum(context.planCode, FEATURE_MIN_PLAN[featureKey]);
}

export function requiredPlanForFeature(featureKey: SubscriptionFeatureKey): SubscriptionPlanCode {
  return FEATURE_MIN_PLAN[featureKey];
}

export function upgradeMessage(featureKey: SubscriptionFeatureKey): string {
  const plan = requiredPlanForFeature(featureKey);
  const label = SUBSCRIPTION_PLAN_DEFAULTS[plan].name;
  return `Upgrade your subscription to ${label} to access ${FEATURE_LABELS[featureKey]}.`;
}

export function featuresForPlanCode(planCode: SubscriptionPlanCode): SubscriptionFeatureKey[] {
  return SUBSCRIPTION_FEATURE_KEYS.filter((key) => planMeetsMinimum(planCode, FEATURE_MIN_PLAN[key]));
}

import type { SubscriptionPlan } from "@/lib/types";

/** Canonical subscription tier codes (lowercase, stored in DB). */
export const SUBSCRIPTION_PLAN_CODES = ["standard", "pro", "enterprise"] as const;
export type SubscriptionPlanCode = (typeof SUBSCRIPTION_PLAN_CODES)[number];

export const DEFAULT_SUBSCRIPTION_PLAN_CODE: SubscriptionPlanCode = "standard";

/** Display order in Super Admin panel. */
export const SUBSCRIPTION_PLAN_ORDER: SubscriptionPlanCode[] = [
  "standard",
  "pro",
  "enterprise",
];

/** Default seat and storage limits per tier (features TBD by product owner). */
export const SUBSCRIPTION_PLAN_DEFAULTS: Record<
  SubscriptionPlanCode,
  { name: string; description: string; maxUsers: number; maxStorageMb: number }
> = {
  standard: {
    name: "Standard",
    description: "Entry tier for growing collection teams.",
    maxUsers: 25,
    maxStorageMb: 1024,
  },
  pro: {
    name: "Pro",
    description: "Advanced tier for multi-agency operations.",
    maxUsers: 100,
    maxStorageMb: 5120,
  },
  enterprise: {
    name: "Enterprise",
    description: "Full platform tier for large organizations.",
    maxUsers: 500,
    maxStorageMb: 20480,
  },
};

/**
 * Re-export from features.ts — canonical list of gated capabilities.
 */
export { SUBSCRIPTION_FEATURE_KEYS } from "./features";

export function isSubscriptionPlanCode(code: string): code is SubscriptionPlanCode {
  return SUBSCRIPTION_PLAN_CODES.includes(code as SubscriptionPlanCode);
}

export function sortSubscriptionPlans(plans: SubscriptionPlan[]): SubscriptionPlan[] {
  return [...plans].sort((a, b) => {
    const ai = SUBSCRIPTION_PLAN_ORDER.indexOf(a.code as SubscriptionPlanCode);
    const bi = SUBSCRIPTION_PLAN_ORDER.indexOf(b.code as SubscriptionPlanCode);
    const aRank = ai === -1 ? 999 : ai;
    const bRank = bi === -1 ? 999 : bi;
    return aRank - bRank || a.name.localeCompare(b.name);
  });
}

export function planTierLabel(code: string): string {
  if (isSubscriptionPlanCode(code)) {
    return SUBSCRIPTION_PLAN_DEFAULTS[code].name;
  }
  return code;
}

export function planTierBadgeClass(code: string): string {
  switch (code) {
    case "standard":
      return "border-white/10 bg-white/5 text-slate-300";
    case "pro":
      return "border-[#00F2FE]/30 bg-[#00F2FE]/10 text-[#00F2FE]";
    case "enterprise":
      return "border-violet-500/30 bg-violet-500/10 text-violet-300";
    default:
      return "border-white/10 bg-white/5 text-slate-400";
  }
}

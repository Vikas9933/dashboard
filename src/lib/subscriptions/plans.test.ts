import { describe, expect, it } from "vitest";
import {
  DEFAULT_SUBSCRIPTION_PLAN_CODE,
  sortSubscriptionPlans,
  SUBSCRIPTION_PLAN_CODES,
} from "./plans";
import type { SubscriptionPlan } from "@/lib/types";

describe("subscription plans", () => {
  it("defines standard, pro, enterprise tiers", () => {
    expect(SUBSCRIPTION_PLAN_CODES).toEqual(["standard", "pro", "enterprise"]);
    expect(DEFAULT_SUBSCRIPTION_PLAN_CODE).toBe("standard");
  });

  it("sorts plans in tier order", () => {
    const plans: SubscriptionPlan[] = [
      {
        id: "3",
        code: "enterprise",
        name: "Enterprise",
        description: null,
        max_users: 500,
        max_storage_mb: 20480,
        features: {},
        is_active: true,
      },
      {
        id: "1",
        code: "standard",
        name: "Standard",
        description: null,
        max_users: 25,
        max_storage_mb: 1024,
        features: {},
        is_active: true,
      },
      {
        id: "2",
        code: "pro",
        name: "Pro",
        description: null,
        max_users: 100,
        max_storage_mb: 5120,
        features: {},
        is_active: true,
      },
    ];

    expect(sortSubscriptionPlans(plans).map((p) => p.code)).toEqual([
      "standard",
      "pro",
      "enterprise",
    ]);
  });
});

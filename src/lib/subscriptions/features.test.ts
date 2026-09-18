import { describe, expect, it } from "vitest";
import {
  FEATURE_MIN_PLAN,
  hasFeature,
  mergeFeatureFlags,
  planMeetsMinimum,
  requiredPlanForFeature,
  upgradeMessage,
} from "./features";
import type { TenantSubscriptionContext } from "@/lib/types";

function mockContext(
  overrides: Partial<TenantSubscriptionContext> = {}
): TenantSubscriptionContext {
  return {
    organizationId: "org-1",
    organizationName: "Test Org",
    planCode: "standard",
    planName: "Standard",
    planStatus: "active",
    userLimit: 25,
    storageLimitMb: 1024,
    currentUserCount: 5,
    currentStorageUsedMb: 100,
    planFeatures: {},
    featureOverrides: {},
    isSuperAdmin: false,
    ...overrides,
  };
}

describe("subscription features", () => {
  it("grants standard features on standard plan", () => {
    const ctx = mockContext({ planCode: "standard" });
    expect(hasFeature(ctx, "dashboard")).toBe(true);
    expect(hasFeature(ctx, "excel_export")).toBe(true);
    expect(hasFeature(ctx, "advanced_analytics")).toBe(false);
    expect(hasFeature(ctx, "api_integration")).toBe(false);
  });

  it("grants pro features on pro plan", () => {
    const ctx = mockContext({ planCode: "pro", planName: "Pro" });
    expect(hasFeature(ctx, "audit_logs")).toBe(true);
    expect(hasFeature(ctx, "settlement_tracking")).toBe(true);
    expect(hasFeature(ctx, "webhooks")).toBe(false);
  });

  it("grants enterprise features on enterprise plan", () => {
    const ctx = mockContext({ planCode: "enterprise", planName: "Enterprise" });
    expect(hasFeature(ctx, "webhooks")).toBe(true);
    expect(hasFeature(ctx, "api_integration")).toBe(true);
  });

  it("respects tenant feature overrides", () => {
    const ctx = mockContext({
      planCode: "standard",
      featureOverrides: { advanced_analytics: true },
    });
    expect(hasFeature(ctx, "advanced_analytics")).toBe(true);
  });

  it("respects plan feature JSON disabling a feature", () => {
    const ctx = mockContext({
      planCode: "pro",
      planFeatures: { audit_logs: false },
    });
    expect(hasFeature(ctx, "audit_logs")).toBe(false);
  });

  it("blocks features when plan is not active", () => {
    const ctx = mockContext({ planCode: "enterprise", planStatus: "cancelled" });
    expect(hasFeature(ctx, "webhooks")).toBe(false);
  });

  it("bypasses checks for super admin", () => {
    const ctx = mockContext({
      planCode: "standard",
      isSuperAdmin: true,
      organizationId: null,
    });
    expect(hasFeature(ctx, "webhooks", { bypassForSuperAdmin: true })).toBe(true);
  });

  it("maps minimum plans correctly", () => {
    expect(requiredPlanForFeature("audit_logs")).toBe("pro");
    expect(requiredPlanForFeature("api_integration")).toBe("enterprise");
    expect(FEATURE_MIN_PLAN.dashboard).toBe("standard");
  });

  it("compares plan tiers", () => {
    expect(planMeetsMinimum("pro", "standard")).toBe(true);
    expect(planMeetsMinimum("standard", "pro")).toBe(false);
  });

  it("merges plan and override flags", () => {
    expect(
      mergeFeatureFlags({ a: true, b: false }, { b: true, c: true })
    ).toEqual({ a: true, b: true, c: true });
  });

  it("returns upgrade message with plan name", () => {
    expect(upgradeMessage("audit_logs")).toContain("Pro");
    expect(upgradeMessage("webhooks")).toContain("Enterprise");
  });
});

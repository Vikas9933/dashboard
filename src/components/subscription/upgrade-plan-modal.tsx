"use client";

import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { planTierBadgeClass, sortSubscriptionPlans, SUBSCRIPTION_PLAN_ORDER, type SubscriptionPlanCode } from "@/lib/subscriptions/plans";
import { FEATURE_LABELS, featuresForPlanCode } from "@/lib/subscriptions/features";
import type { SubscriptionPlan, TenantSubscriptionContext } from "@/lib/types";

interface UpgradePlanModalProps {
  context: TenantSubscriptionContext;
  plans: SubscriptionPlan[];
  canChangePlan: boolean;
}

export function UpgradePlanModal({ context, plans, canChangePlan }: UpgradePlanModalProps) {
  const [open, setOpen] = useState(false);
  const tierPlans = sortSubscriptionPlans(plans);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="dash-btn-primary inline-flex items-center gap-2"
      >
        <Sparkles className="h-4 w-4" />
        {canChangePlan ? "Change plan" : "Request upgrade"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} aria-hidden />
          <div className="dash-glass relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">Compare subscription plans</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Current: <span className="font-semibold text-[#00F2FE]">{context.planName}</span>
                  {!canChangePlan && " — contact your platform administrator to upgrade."}
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {tierPlans.map((plan) => {
                const isCurrent = plan.code === context.planCode;
                const code = plan.code as SubscriptionPlanCode;
                const highlights = featuresForPlanCode(code).slice(0, 6);
                return (
                  <div
                    key={plan.id}
                    className={`dash-clay rounded-xl p-4 ${isCurrent ? "border border-[#00F2FE]/40 ring-2 ring-[#00F2FE]/10" : ""}`}
                  >
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${planTierBadgeClass(plan.code)}`}
                    >
                      {plan.name}
                    </span>
                    {isCurrent && (
                      <p className="mt-2 text-xs font-semibold text-[#00F2FE]">Your current plan</p>
                    )}
                    <p className="mt-2 text-sm text-slate-400">{plan.description}</p>
                    <p className="mt-3 text-sm font-semibold text-white">
                      {plan.max_users} users · {plan.max_storage_mb} MB
                    </p>
                    <ul className="mt-3 space-y-1 text-xs text-slate-400">
                      {highlights.map((key) => (
                        <li key={key}>• {FEATURE_LABELS[key]}</li>
                      ))}
                      {featuresForPlanCode(code).length > 6 && (
                        <li className="text-slate-500">
                          +{featuresForPlanCode(code).length - 6} more features
                        </li>
                      )}
                    </ul>
                  </div>
                );
              })}
            </div>

            {!canChangePlan && (
              <p className="mt-4 rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-slate-400">
                Client Admins can view usage and request upgrades. Only the Super Admin can change
                plans from the Platform panel.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export { SUBSCRIPTION_PLAN_ORDER };

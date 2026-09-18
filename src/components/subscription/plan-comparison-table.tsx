import type { SubscriptionPlan, SubscriptionFeatureKey } from "@/lib/types";
import { FEATURE_LABELS, featuresForPlanCode } from "@/lib/subscriptions/features";
import { planTierBadgeClass, sortSubscriptionPlans } from "@/lib/subscriptions/plans";
import type { SubscriptionPlanCode } from "@/lib/subscriptions/plans";
import { Card, CardHeader, CardBody } from "@/components/ui/card";

const COMPARISON_FEATURES: SubscriptionFeatureKey[] = [
  "user_management",
  "dashboard",
  "excel_export",
  "advanced_analytics",
  "settlement_tracking",
  "audit_logs",
  "email_notifications",
  "api_integration",
  "webhooks",
  "white_label",
];

export function PlanComparisonTable({
  plans,
  currentPlanCode,
}: {
  plans: SubscriptionPlan[];
  currentPlanCode: string;
}) {
  const tierPlans = sortSubscriptionPlans(plans);

  return (
    <Card variant="glass">
      <CardHeader variant="glass">
        <h3 className="font-semibold text-white">Plan comparison</h3>
        <p className="text-sm text-slate-400">
          Feature bundles live in the database and can be updated without redeploying code.
        </p>
      </CardHeader>
      <CardBody className="overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02] text-xs uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3 font-medium">Feature</th>
              {tierPlans.map((plan) => (
                <th key={plan.id} className="px-4 py-3 font-medium">
                  <span className={`rounded-full border px-2 py-0.5 ${planTierBadgeClass(plan.code)}`}>
                    {plan.name}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPARISON_FEATURES.map((feature) => (
              <tr key={feature} className="border-b border-white/[0.03]">
                <td className="px-4 py-2.5 text-slate-300">{FEATURE_LABELS[feature]}</td>
                {tierPlans.map((plan) => {
                  const included = featuresForPlanCode(plan.code as SubscriptionPlanCode).includes(
                    feature
                  );
                  const isCurrent = plan.code === currentPlanCode;
                  return (
                    <td
                      key={plan.id}
                      className={`px-4 py-2.5 text-center ${isCurrent ? "bg-[#00F2FE]/5" : ""}`}
                    >
                      {included ? (
                        <span className="font-semibold text-emerald-400">✓</span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </CardBody>
    </Card>
  );
}

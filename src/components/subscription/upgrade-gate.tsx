import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";
import { planTierBadgeClass } from "@/lib/subscriptions/plans";
import { FEATURE_LABELS, requiredPlanForFeature } from "@/lib/subscriptions/features";
import { SUBSCRIPTION_PLAN_DEFAULTS } from "@/lib/subscriptions/plans";
import type { SubscriptionFeatureKey } from "@/lib/types";

interface UpgradeGateProps {
  featureKey: SubscriptionFeatureKey;
  title?: string;
  message?: string;
  showUpgradeLink?: boolean;
}

export function UpgradeGate({
  featureKey,
  title = "Upgrade required",
  message,
  showUpgradeLink = true,
}: UpgradeGateProps) {
  const required = requiredPlanForFeature(featureKey);
  const planName = SUBSCRIPTION_PLAN_DEFAULTS[required].name;
  const featureLabel = FEATURE_LABELS[featureKey];

  return (
    <div className="dash-glass mx-auto max-w-lg rounded-2xl p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
        <Lock className="h-7 w-7" />
      </div>
      <h1 className="mt-4 text-xl font-bold text-white">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">
        {message ??
          `Upgrade your subscription plan to access ${featureLabel}.`}
      </p>
      <span
        className={`mt-4 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${planTierBadgeClass(required)}`}
      >
        Requires {planName}
      </span>
      {showUpgradeLink && (
        <div className="mt-6">
          <Link href="/dashboard/subscription" className="dash-btn-primary inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            View plans & usage
          </Link>
        </div>
      )}
    </div>
  );
}

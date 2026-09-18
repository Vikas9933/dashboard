import { redirect } from "next/navigation";
import { SubscriptionPanel } from "@/components/subscription/subscription-panel";
import { getSubscriptionPageData } from "@/app/dashboard/subscription/actions";

export const metadata = {
  title: "Subscription | Collection & Recovery Dashboard",
};

export default async function SubscriptionPage() {
  const data = await getSubscriptionPageData();
  if (!data?.profile) redirect("/login");
  if (!data.context) {
    return (
      <div className="dash-glass rounded-2xl p-8 text-center text-sm text-slate-400">
        No organization subscription is linked to your account.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Subscription & usage</h2>
        <p className="mt-1 text-sm text-slate-400">
          {data.isReadOnly
            ? "View your organization plan and usage limits."
            : data.canManagePlan
              ? "Manage organization plans, limits, and usage across all clients."
              : "View your plan, monitor usage, and request an upgrade."}
        </p>
      </div>
      <SubscriptionPanel
        context={data.context}
        plans={data.plans}
        canManagePlan={data.canManagePlan}
        canRequestUpgrade={data.canRequestUpgrade}
      />
    </div>
  );
}

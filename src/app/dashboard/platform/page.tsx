import { redirect } from "next/navigation";
import { PlatformManagement } from "@/components/admin/platform-management";
import {
  getPlatformActivity,
  getPlatformTenants,
  getSubscriptionPlans,
  getTenantUsage,
} from "@/app/dashboard/platform/actions";
import { getCurrentProfile } from "@/lib/dashboard";
import { canAccessPlatform } from "@/lib/auth/permissions";

export default async function PlatformPage() {
  const profile = await getCurrentProfile();

  if (!profile || !canAccessPlatform(profile)) {
    redirect("/dashboard");
  }

  const [tenants, plans, usage, activity] = await Promise.all([
    getPlatformTenants().catch(() => []),
    getSubscriptionPlans().catch(() => []),
    getTenantUsage().catch(() => []),
    getPlatformActivity().catch(() => []),
  ]);

  return (
    <div className="space-y-8">
      <div className="dash-glass dash-hero-glow rounded-2xl px-5 py-4">
        <h2 className="text-lg font-bold text-white">Super Admin Panel</h2>
        <p className="mt-1 text-sm text-slate-400">
          Manage clients, Standard / Pro / Enterprise subscriptions, usage limits, and platform activity.
        </p>
      </div>

      <PlatformManagement
        tenants={tenants}
        plans={plans}
        usage={usage}
        activity={activity}
      />
    </div>
  );
}

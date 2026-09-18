import { Sidebar, MobileNav } from "@/components/layout/sidebar";
import { formatRole } from "@/lib/format";
import type { DashboardConfig, Profile, SubscriptionFeatureKey, TenantSubscriptionContext } from "@/lib/types";
import { Activity, Sparkles } from "lucide-react";

interface DashboardShellProps {
  children: React.ReactNode;
  profile: Profile | null;
  config: DashboardConfig;
  enabledFeatures?: Record<SubscriptionFeatureKey, boolean>;
  subscriptionContext?: TenantSubscriptionContext | null;
}

export function DashboardShell({
  children,
  profile,
  config,
  enabledFeatures,
  subscriptionContext,
}: DashboardShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#0B1120]">
      <div className="hidden shrink-0 lg:block">
        <Sidebar
          profile={profile}
          enabledFeatures={enabledFeatures}
          subscriptionContext={subscriptionContext}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="dash-header sticky top-0 z-40 px-4 py-3 lg:px-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div className="flex min-w-0 items-start gap-3 sm:items-center">
              <MobileNav
                profile={profile}
                enabledFeatures={enabledFeatures}
                subscriptionContext={subscriptionContext}
              />
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 shrink-0 text-[#00F2FE]" />
                  <h1 className="line-clamp-2 text-sm font-bold leading-snug text-white sm:line-clamp-1 sm:text-base lg:text-lg">
                    {config.dashboardTitle}
                  </h1>
                </div>
                <p className="mt-0.5 truncate text-xs text-slate-400 sm:text-sm">
                  {profile?.full_name} · {profile ? formatRole(profile.role) : "User"}
                </p>
              </div>
            </div>
            <div className="hidden items-center gap-3 sm:flex">
              <div className="flex items-center gap-2 rounded-full border border-[#00F2FE]/20 bg-[#00F2FE]/10 px-3 py-1.5 text-xs font-medium text-[#00F2FE]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00F2FE] opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00F2FE]" />
                </span>
                Live Recovery Data
              </div>
              <div className="flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-300">
                <Activity className="h-3.5 w-3.5" />
                KPI Target {config.kpiTargetPercent}%
              </div>
            </div>
          </div>
        </header>
        <main className="dash-canvas flex-1 overflow-y-auto px-4 py-6 lg:px-8">
          <div className="dash-stage">{children}</div>
        </main>
      </div>
    </div>
  );
}

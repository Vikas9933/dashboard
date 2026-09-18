import { Suspense } from "react";
import { redirect } from "next/navigation";
import { BrainCircuit } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getFilterOptions, getAnalyticsWorkspaceData, parseFilters } from "@/lib/dashboard";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { AnalyticsWorkspace } from "@/components/analytics/analytics-workspace";
import { UpgradeGate } from "@/components/subscription/upgrade-gate";
import { requireFeature } from "@/lib/subscriptions/guard";

export const metadata = {
  title: "Advanced Analytics & Intelligence | Collection & Recovery Dashboard",
};

interface AnalyticsPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

function FiltersSkeleton() {
  return <div className="h-24 animate-pulse rounded-2xl bg-white/5" />;
}

function WorkspaceSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-12 animate-pulse rounded-2xl bg-white/5" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-white/5" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-2xl bg-white/5" />
    </div>
  );
}

async function FiltersSection() {
  const options = await getFilterOptions();
  return <FilterBar {...options} basePath="/dashboard/analytics" />;
}

async function WorkspaceSection({ filters }: { filters: ReturnType<typeof parseFilters> }) {
  const data = await getAnalyticsWorkspaceData(filters);
  return <AnalyticsWorkspace data={data} />;
}

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();

  try {
    await requireFeature(supabase, profile, "advanced_analytics");
  } catch {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <UpgradeGate featureKey="advanced_analytics" />
      </div>
    );
  }

  const params = await searchParams;
  const filters = parseFilters(params);

  return (
    <div className="space-y-6">
      <div className="dash-glass dash-hero-glow rounded-2xl px-4 py-4 sm:px-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#00F2FE]/15 text-[#00F2FE] shadow-lg shadow-[#00F2FE]/20">
            <BrainCircuit className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="dash-section-title text-lg font-bold text-white sm:text-xl">
              Advanced Analytics &amp; Intelligence
            </h1>
            <p className="mt-1 text-sm leading-relaxed text-slate-400">
              Executive KPIs, projections, PTP intelligence, funnels, rankings, forecasting and a custom report
              builder — everything updates live with the filters below.
            </p>
          </div>
        </div>
      </div>

      <Suspense fallback={<FiltersSkeleton />}>
        <FiltersSection />
      </Suspense>

      <Suspense fallback={<WorkspaceSkeleton />}>
        <WorkspaceSection filters={filters} />
      </Suspense>
    </div>
  );
}

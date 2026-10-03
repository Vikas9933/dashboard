import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getFilterOptions, parseFilters, getDialerWorkspaceData } from "@/lib/dashboard";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { DialerWorkspace } from "@/components/dialer/dialer-workspace";
import { UpgradeGate } from "@/components/subscription/upgrade-gate";
import { requireFeature } from "@/lib/subscriptions/guard";

export const metadata = {
  title: "Dialer Management & Performance | Collection & Recovery Dashboard",
};

interface DialerPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

function FiltersSkeleton() {
  return <div className="h-24 animate-pulse rounded-2xl bg-white/5" />;
}

function WorkspaceSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-10 animate-pulse rounded-2xl bg-white/5" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-white/5" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-2xl bg-white/5" />
    </div>
  );
}

async function FiltersSection() {
  const options = await getFilterOptions();
  return <FilterBar {...options} basePath="/dashboard/dialer" />;
}

async function WorkspaceSection({ filters }: { filters: ReturnType<typeof parseFilters> }) {
  const data = await getDialerWorkspaceData(filters);
  return <DialerWorkspace data={data} />;
}

export default async function DialerPage({ searchParams }: DialerPageProps) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();

  try {
    await requireFeature(supabase, profile, "dialer_management");
  } catch {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <UpgradeGate featureKey="dialer_management" />
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
            <Phone className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="dash-section-title text-lg font-bold text-white sm:text-xl">
              Dialer Management &amp; Performance
            </h1>
            <p className="mt-1 text-sm leading-relaxed text-slate-400">
              Track agent calling against allocated cases — attempts, connects, RPC, PTP, and actual
              resolution — drillable from client and bank down to the customer.
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

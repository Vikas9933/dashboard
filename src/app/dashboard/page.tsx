import { Suspense } from "react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { RecoveryHero } from "@/components/dashboard/recovery-hero";
import { TrendCharts } from "@/components/dashboard/trend-charts";
import { BucketChart } from "@/components/dashboard/bucket-chart";
import { BucketCards } from "@/components/dashboard/bucket-cards";
import { AgentTable } from "@/components/dashboard/agent-table";
import { TeamTable } from "@/components/dashboard/team-table";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { CustomerSearch } from "@/components/dashboard/customer-search";
import { FieldVisitsTable } from "@/components/dashboard/field-visits-table";
import { SettlementsTable } from "@/components/dashboard/settlements-table";
import { ExportBar } from "@/components/dashboard/export-bar";
import {
  getAgentPerformance,
  getAchievementTrend,
  getBucketPerformance,
  getCollectionTrends,
  getCurrentProfile,
  getDashboardKpis,
  getFieldVisits,
  getFilterOptions,
  getSettlements,
  getTeamPerformance,
  parseFilters,
  searchCustomers,
} from "@/lib/dashboard";
import { getDashboardConfig } from "@/app/dashboard/admin/actions";
import { getAccountsForFieldVisit } from "@/app/dashboard/actions";
import { canApproveSettlement, canExport } from "@/lib/auth/permissions";
import { formatCurrency, formatNumber, formatPercent, formatRole } from "@/lib/format";
import type { DashboardConfig } from "@/lib/types";

interface DashboardPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

function FiltersSkeleton() {
  return <div className="h-24 animate-pulse rounded-2xl bg-white/5" />;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="dash-section-title mb-4">{children}</h2>;
}

async function DashboardContent({
  filters,
  searchQuery,
  config,
  showExport,
  showSettlementActions,
}: {
  filters: ReturnType<typeof parseFilters>;
  searchQuery?: string;
  config: DashboardConfig;
  showExport: boolean;
  showSettlementActions: boolean;
}) {
  const [
    kpis,
    trends,
    achievement,
    buckets,
    agents,
    teams,
    visits,
    settlements,
    customers,
    accounts,
  ] = await Promise.all([
    getDashboardKpis(filters),
    getCollectionTrends(filters),
    getAchievementTrend(filters),
    getBucketPerformance(filters),
    getAgentPerformance(filters),
    getTeamPerformance(filters),
    getFieldVisits(),
    getSettlements(),
    searchQuery ? searchCustomers(searchQuery) : Promise.resolve([]),
    getAccountsForFieldVisit(),
  ]);

  return (
    <div className="space-y-10">
      <section id="overview">
        <SectionTitle>Recovery Command Center</SectionTitle>
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-6 xl:col-span-7">
            <RecoveryHero
              collectedAmount={Math.round(kpis.totalCollected)}
              collectedFormatted={formatCurrency(kpis.totalCollected)}
              collectionPercent={kpis.collectionPercentage}
              totalAccounts={kpis.totalAccounts}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-6 xl:col-span-5">
            <KpiCard title="Outstanding" value={formatCurrency(kpis.totalOutstanding)} icon="wallet" accent="rose" />
            <KpiCard title="Collection %" value={formatPercent(kpis.collectionPercentage)} icon="percent" accent="teal" />
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          <KpiCard title="Accounts Allocated" value={formatNumber(kpis.totalAccounts)} icon="briefcase" accent="purple" />
          <KpiCard title="PTP Count" value={formatNumber(kpis.ptpCount)} icon="handCoins" accent="purple" />
          <KpiCard title="PTP Amount" value={formatCurrency(kpis.ptpAmount)} icon="handCoins" accent="teal" />
          <KpiCard title="Kept PTP" value={formatNumber(kpis.keptPtp)} icon="checkCircle" accent="emerald" />
          <KpiCard title="Broken PTP" value={formatNumber(kpis.brokenPtp)} icon="xCircle" accent="amber" />
          <KpiCard title="Active Agents" value={formatNumber(kpis.activeAgents)} icon="userCheck" accent="teal" />
          <KpiCard title="Active Teams" value={formatNumber(kpis.activeTeams)} icon="users" accent="purple" />
          <KpiCard title="Allocated" value={formatCurrency(kpis.totalOutstanding + kpis.totalCollected)} icon="circleDollar" accent="teal" />
        </div>
      </section>

      <section id="analytics">
        <SectionTitle>Performance Analytics</SectionTitle>
        <div className="grid gap-6 xl:grid-cols-2">
          <TrendCharts
            daily={trends.daily}
            weekly={trends.weekly}
            monthly={trends.monthly}
            achievement={achievement}
            showWeeklyTrend={config.showWeeklyTrend}
            showMonthlyTrend={config.showMonthlyTrend}
          />
          <BucketChart data={buckets.filter((b) => b.accountCount > 0)} />
        </div>
      </section>

      <section>
        <SectionTitle>Delinquency Buckets</SectionTitle>
        <BucketCards data={buckets} />
      </section>

      <section>
        <AgentTable agents={agents} />
      </section>

      <section id="teams">
        <TeamTable teams={teams} />
      </section>

      <section id="search">
        <CustomerSearch results={customers} />
      </section>

      <section id="visits">
        <FieldVisitsTable visits={visits} accounts={accounts} />
      </section>

      <section id="settlements">
        <SettlementsTable settlements={settlements} canApprove={showSettlementActions} />
      </section>

      {showExport && (
        <section id="reports">
          <Suspense fallback={<div className="h-16 animate-pulse rounded-2xl bg-white/5" />}>
            <ExportBar />
          </Suspense>
        </section>
      )}
    </div>
  );
}

async function FiltersSection() {
  const options = await getFilterOptions();
  return <FilterBar {...options} />;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const [profile, config] = await Promise.all([getCurrentProfile(), getDashboardConfig()]);
  const filters = parseFilters(params);

  return (
    <div className="space-y-6">
      <div className="dash-glass rounded-2xl px-4 py-4 sm:px-5">
        <p className="text-sm leading-relaxed text-slate-300">
          Welcome back,{" "}
          <span className="font-semibold text-white">{profile?.full_name}</span>
          {profile && (
            <span className="ml-2 inline-flex rounded-full border border-[#00F2FE]/20 bg-[#00F2FE]/10 px-2 py-0.5 text-xs font-medium text-[#00F2FE]">
              {formatRole(profile.role)}
            </span>
          )}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">
          Monitor recovery performance, PTP tracking & team productivity · KPI target{" "}
          <span className="font-semibold text-violet-400">{config.kpiTargetPercent}%</span>
        </p>
      </div>

      <Suspense fallback={<FiltersSkeleton />}>
        <FiltersSection />
      </Suspense>

      <Suspense
        fallback={
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-white/5" />
            ))}
          </div>
        }
      >
        <DashboardContent
          filters={filters}
          searchQuery={params.q}
          config={config}
          showExport={profile ? canExport(profile) : false}
          showSettlementActions={profile ? canApproveSettlement(profile) : false}
        />
      </Suspense>
    </div>
  );
}

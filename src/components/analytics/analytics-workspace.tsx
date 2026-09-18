"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Calculator,
  Filter as FunnelIcon,
  Gauge,
  GitCompareArrows,
  LayoutGrid,
  LineChart as LineChartIcon,
  ListTree,
  Sparkles,
  TableProperties,
  Target,
  TrendingUp,
  Trophy,
  Download as DownloadIcon,
} from "lucide-react";
import { ExecutiveDashboard } from "@/components/analytics/executive-dashboard";
import { ProjectionPanel } from "@/components/analytics/projection-panel";
import { TrendExplorer } from "@/components/analytics/trend-explorer";
import { PtpAnalyticsPanel } from "@/components/analytics/ptp-analytics-panel";
import { CollectionFunnel } from "@/components/analytics/collection-funnel";
import { ProductivityRankingsPanel } from "@/components/analytics/productivity-rankings";
import { RecoveryHeatmap } from "@/components/analytics/recovery-heatmap";
import { AlertsInsightsPanel } from "@/components/analytics/alerts-insights";
import { ComparisonDashboardPanel } from "@/components/analytics/comparison-dashboard";
import { ForecastPanel } from "@/components/analytics/forecast-panel";
import { CustomAnalyticsBuilder } from "@/components/analytics/custom-builder";
import { DrilldownExplorer, type DrillPathStep } from "@/components/analytics/drilldown-explorer";
import { DownloadCenter } from "@/components/analytics/download-center";
import {
  PersonalizePanel,
  type AnalyticsDensity,
  type AnalyticsTheme,
  type SavedDashboardLayout,
  type TabMeta,
} from "@/components/analytics/personalize-panel";
import type { AnalyticsWorkspaceData } from "@/lib/services";

const DEFAULT_TABS: TabMeta[] = [
  { id: "executive", label: "Executive" },
  { id: "projection", label: "Projection" },
  { id: "trends", label: "Trends" },
  { id: "ptp", label: "PTP Analytics" },
  { id: "funnel", label: "Funnel" },
  { id: "productivity", label: "Productivity" },
  { id: "heatmap", label: "Heatmap" },
  { id: "alerts", label: "Alerts & AI Insights" },
  { id: "comparison", label: "Comparison" },
  { id: "forecast", label: "Forecast" },
  { id: "builder", label: "Custom Builder" },
  { id: "drilldown", label: "Drill Down" },
  { id: "downloads", label: "Downloads" },
  { id: "personalize", label: "Personalize" },
];

const TAB_ICONS: Record<string, typeof Gauge> = {
  executive: Gauge,
  projection: Calculator,
  trends: TrendingUp,
  ptp: Target,
  funnel: FunnelIcon,
  productivity: Trophy,
  heatmap: LayoutGrid,
  alerts: Sparkles,
  comparison: GitCompareArrows,
  forecast: LineChartIcon,
  builder: TableProperties,
  drilldown: ListTree,
  downloads: DownloadIcon,
  personalize: BarChart3,
};

const STORAGE_KEY = "analytics-tab-prefs";
const SAVED_KEY = "analytics-saved-dashboards";

interface StoredPrefs {
  order: string[];
  hidden: string[];
  theme: AnalyticsTheme;
  density: AnalyticsDensity;
}

function defaultPrefs(): StoredPrefs {
  return { order: DEFAULT_TABS.map((t) => t.id), hidden: [], theme: "dark", density: "comfortable" };
}

function loadPrefs(): StoredPrefs {
  if (typeof window === "undefined") return defaultPrefs();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPrefs();
    const parsed = JSON.parse(raw) as Partial<StoredPrefs>;
    const knownIds = new Set(DEFAULT_TABS.map((t) => t.id));
    const order = (parsed.order ?? []).filter((id) => knownIds.has(id));
    for (const t of DEFAULT_TABS) if (!order.includes(t.id)) order.push(t.id);
    return {
      order,
      hidden: (parsed.hidden ?? []).filter((id) => knownIds.has(id)),
      theme: parsed.theme ?? "dark",
      density: parsed.density ?? "comfortable",
    };
  } catch {
    return defaultPrefs();
  }
}

function loadSavedDashboards(): SavedDashboardLayout[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]") as SavedDashboardLayout[];
  } catch {
    return [];
  }
}

const THEME_CLASS: Record<AnalyticsTheme, string> = {
  dark: "",
  light: "analytics-theme-light",
  corporate: "analytics-theme-corporate",
};

const DENSITY_CLASS: Record<AnalyticsDensity, string> = {
  compact: "analytics-density-compact",
  comfortable: "",
  spacious: "analytics-density-spacious",
};

export function AnalyticsWorkspace({ data }: { data: AnalyticsWorkspaceData }) {
  const [prefs, setPrefs] = useState<StoredPrefs>(defaultPrefs);
  const [savedDashboards, setSavedDashboards] = useState<SavedDashboardLayout[]>([]);
  const [activeTab, setActiveTab] = useState("executive");
  const [drillPath, setDrillPath] = useState<DrillPathStep[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrefs(loadPrefs());
    setSavedDashboards(loadSavedDashboards());
  }, []);

  function persist(next: StoredPrefs) {
    setPrefs(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  const orderedTabs = useMemo(
    () => prefs.order.map((id) => DEFAULT_TABS.find((t) => t.id === id)).filter(Boolean) as TabMeta[],
    [prefs.order]
  );
  const visibleTabs = orderedTabs.filter((t) => !prefs.hidden.includes(t.id) || t.id === "personalize");

  useEffect(() => {
    if (visibleTabs.length && !visibleTabs.some((t) => t.id === activeTab)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab(visibleTabs[0].id);
    }
  }, [visibleTabs, activeTab]);

  function openDrilldown() {
    setDrillPath([]);
    setActiveTab("drilldown");
  }

  function goToDrilldown(level: DrillPathStep["level"], value: string) {
    setDrillPath([{ level, value }]);
    setActiveTab("drilldown");
  }

  const rankTabToLevel: Record<string, DrillPathStep["level"] | null> = {
    stateRanking: "state",
    cityRanking: "city",
    teamRanking: "branch",
    agencyRanking: "agency",
    tlRanking: "tl",
    agentRanking: "agent",
  };

  function saveDashboard(name: string) {
    const layout: SavedDashboardLayout = {
      name,
      order: prefs.order,
      hidden: prefs.hidden,
      theme: prefs.theme,
      density: prefs.density,
    };
    const updated = [...savedDashboards.filter((d) => d.name !== name), layout];
    setSavedDashboards(updated);
    localStorage.setItem(SAVED_KEY, JSON.stringify(updated));
  }

  function loadDashboard(name: string) {
    const layout = savedDashboards.find((d) => d.name === name);
    if (!layout) return;
    persist({ order: layout.order, hidden: layout.hidden, theme: layout.theme, density: layout.density });
  }

  const wrapperClass = [THEME_CLASS[prefs.theme], DENSITY_CLASS[prefs.density]].filter(Boolean).join(" ");

  return (
    <div className={`space-y-4 ${wrapperClass}`}>
      <div className="dash-glass flex gap-1.5 overflow-x-auto rounded-2xl p-2">
        {visibleTabs.map((tab) => {
          const Icon = TAB_ICONS[tab.id] ?? Gauge;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-[#00F2FE]/20 to-violet-500/20 text-white"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div id="analytics-capture-area">
        {activeTab === "executive" && (
          <ExecutiveDashboard data={data.executive} kpiTargetPercent={data.kpiTargetPercent} onDrill={openDrilldown} />
        )}
        {activeTab === "projection" && (
          <ProjectionPanel data={data.executive} kpiTargetPercent={data.kpiTargetPercent} onDrill={openDrilldown} />
        )}
        {activeTab === "trends" && <TrendExplorer data={data.trends} />}
        {activeTab === "ptp" && <PtpAnalyticsPanel data={data.ptp} />}
        {activeTab === "funnel" && <CollectionFunnel data={data.funnel} />}
        {activeTab === "productivity" && (
          <ProductivityRankingsPanel
            data={data.productivity}
            onDrill={(tab, _key, name) => {
              const level = rankTabToLevel[tab];
              if (level) goToDrilldown(level, name);
            }}
          />
        )}
        {activeTab === "heatmap" && <RecoveryHeatmap data={data.productivity} />}
        {activeTab === "alerts" && <AlertsInsightsPanel alerts={data.alerts} insights={data.insights} />}
        {activeTab === "comparison" && <ComparisonDashboardPanel comparisons={data.comparisons} productivity={data.productivity} />}
        {activeTab === "forecast" && <ForecastPanel data={data.forecast} />}
        {activeTab === "builder" && <CustomAnalyticsBuilder rows={data.flatAccounts} />}
        {activeTab === "drilldown" && (
          <DrilldownExplorer rows={data.flatAccounts} initialPath={drillPath} key={JSON.stringify(drillPath)} />
        )}
        {activeTab === "downloads" && <DownloadCenter captureTargetId="analytics-capture-area" />}
        {activeTab === "personalize" && (
          <PersonalizePanel
            tabs={orderedTabs}
            hidden={new Set(prefs.hidden)}
            theme={prefs.theme}
            density={prefs.density}
            savedDashboards={savedDashboards}
            onToggleHidden={(id) => {
              if (id === "personalize") return;
              const hidden = prefs.hidden.includes(id) ? prefs.hidden.filter((h) => h !== id) : [...prefs.hidden, id];
              persist({ ...prefs, hidden });
            }}
            onMove={(id, direction) => {
              const idx = prefs.order.indexOf(id);
              const swapWith = direction === "up" ? idx - 1 : idx + 1;
              if (swapWith < 0 || swapWith >= prefs.order.length) return;
              const order = [...prefs.order];
              [order[idx], order[swapWith]] = [order[swapWith], order[idx]];
              persist({ ...prefs, order });
            }}
            onReset={() => persist(defaultPrefs())}
            onThemeChange={(theme) => persist({ ...prefs, theme })}
            onDensityChange={(density) => persist({ ...prefs, density })}
            onSaveDashboard={saveDashboard}
            onLoadDashboard={loadDashboard}
          />
        )}
      </div>

      {data.truncated && (
        <p className="text-center text-xs text-slate-500">
          Portfolio exceeds 5,000 accounts — Custom Builder and Drill Down show a representative sample.
        </p>
      )}
    </div>
  );
}

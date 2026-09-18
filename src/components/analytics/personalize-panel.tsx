"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, RotateCcw, Save, FolderOpen } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

export interface TabMeta {
  id: string;
  label: string;
}

export type AnalyticsTheme = "dark" | "light" | "corporate";
export type AnalyticsDensity = "compact" | "comfortable" | "spacious";

export interface SavedDashboardLayout {
  name: string;
  order: string[];
  hidden: string[];
  theme: AnalyticsTheme;
  density: AnalyticsDensity;
}

interface PersonalizePanelProps {
  tabs: TabMeta[];
  hidden: Set<string>;
  theme: AnalyticsTheme;
  density: AnalyticsDensity;
  savedDashboards: SavedDashboardLayout[];
  onToggleHidden: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  onReset: () => void;
  onThemeChange: (theme: AnalyticsTheme) => void;
  onDensityChange: (density: AnalyticsDensity) => void;
  onSaveDashboard: (name: string) => void;
  onLoadDashboard: (name: string) => void;
}

const selectClass =
  "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 outline-none transition focus:border-[#00F2FE]/40";

export function PersonalizePanel({
  tabs,
  hidden,
  theme,
  density,
  savedDashboards,
  onToggleHidden,
  onMove,
  onReset,
  onThemeChange,
  onDensityChange,
  onSaveDashboard,
  onLoadDashboard,
}: PersonalizePanelProps) {
  const [dashboardName, setDashboardName] = useState("");

  return (
    <div className="space-y-4">
      <Card variant="glass">
        <CardHeader variant="glass">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-white">Dashboard Personalization</h2>
              <p className="mt-0.5 text-sm text-slate-400">Move, hide, resize, theme, and save your personal layout</p>
            </div>
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Layout
            </button>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-slate-500">Dashboard Theme</label>
              <select className={selectClass} value={theme} onChange={(e) => onThemeChange(e.target.value as AnalyticsTheme)}>
                <option value="dark">Professional Dark Theme</option>
                <option value="light">Professional Light Theme</option>
                <option value="corporate">Corporate Theme</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Widget Density (Resize)</label>
              <select className={selectClass} value={density} onChange={(e) => onDensityChange(e.target.value as AnalyticsDensity)}>
                <option value="compact">Compact — more widgets per row</option>
                <option value="comfortable">Comfortable — default</option>
                <option value="spacious">Spacious — larger widgets</option>
              </select>
            </div>
          </div>

          <div className="mt-4 dash-clay rounded-2xl p-4">
            <p className="text-sm font-semibold text-white">Create Personal Dashboard</p>
            <p className="mt-1 text-xs text-slate-500">Save the current tab order, visibility, theme, and density.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                type="text"
                value={dashboardName}
                onChange={(e) => setDashboardName(e.target.value)}
                placeholder="My Executive View"
                className="dash-input flex-1 rounded-xl px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => {
                  const name = dashboardName.trim() || "My Dashboard";
                  onSaveDashboard(name);
                  setDashboardName("");
                }}
                className="dash-btn-primary flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold"
              >
                <Save className="h-3.5 w-3.5" />
                Save Layout
              </button>
            </div>
            {savedDashboards.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {savedDashboards.map((d) => (
                  <button
                    key={d.name}
                    type="button"
                    onClick={() => onLoadDashboard(d.name)}
                    className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/10"
                  >
                    <FolderOpen className="h-3 w-3" />
                    {d.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Sections — drag order via arrows, hide with eye icon</p>
            {tabs.map((tab, i) => {
              const isHidden = hidden.has(tab.id);
              return (
                <div
                  key={tab.id}
                  className={`flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-4 py-3 ${isHidden ? "opacity-50" : ""}`}
                >
                  <span className="text-sm font-medium text-white">{tab.label}</span>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => onMove(tab.id, "up")} disabled={i === 0} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-30" title="Move up">
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => onMove(tab.id, "down")} disabled={i === tabs.length - 1} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-30" title="Move down">
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => onToggleHidden(tab.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white" title={isHidden ? "Show section" : "Hide section"}>
                      {isHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

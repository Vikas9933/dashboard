"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/format";
import type { TrendPoint } from "@/lib/types";

interface TrendChartsProps {
  daily: TrendPoint[];
  weekly: TrendPoint[];
  monthly: TrendPoint[];
  achievement: TrendPoint[];
  showWeeklyTrend?: boolean;
  showMonthlyTrend?: boolean;
}

type Tab = "daily" | "weekly" | "monthly" | "achievement";

const TEAL = "#00F2FE";
const PURPLE = "#A855F7";
const GRID = "rgba(148, 163, 184, 0.1)";
const TICK = "#64748b";

const tooltipStyle = {
  borderRadius: "12px",
  border: "1px solid rgba(0, 242, 254, 0.2)",
  background: "rgba(11, 17, 32, 0.95)",
  boxShadow: "0 0 30px rgba(0, 242, 254, 0.15)",
  color: "#f8fafc",
};

export function TrendCharts({
  daily,
  weekly,
  monthly,
  achievement,
  showWeeklyTrend = true,
  showMonthlyTrend = true,
}: TrendChartsProps) {
  const [tab, setTab] = useState<Tab>("daily");

  const dataMap: Record<Tab, TrendPoint[]> = { daily, weekly, monthly, achievement };
  const data = dataMap[tab].map((d) => ({
    ...d,
    displayLabel:
      tab === "monthly"
        ? new Date(d.label + "-01").toLocaleDateString("en-IN", { month: "short", year: "2-digit" })
        : new Date(d.label).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
  }));

  const tabs: { id: Tab; label: string }[] = [
    { id: "daily", label: "Daily" },
    ...(showWeeklyTrend ? [{ id: "weekly" as Tab, label: "Weekly" }] : []),
    ...(showMonthlyTrend ? [{ id: "monthly" as Tab, label: "Monthly" }] : []),
    { id: "achievement", label: "Recovery %" },
  ];

  const isAchievement = tab === "achievement";

  return (
    <Card variant="glass" className="h-full">
      <CardHeader variant="glass">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-white">Recovery Rate Trends</h2>
            <p className="mt-0.5 text-sm text-slate-400">Isometric performance analytics</p>
          </div>
          <div className="flex rounded-xl border border-white/5 bg-white/5 p-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  tab === t.id
                    ? "bg-gradient-to-r from-[#00F2FE]/20 to-violet-500/20 text-[#00F2FE]"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardBody>
        <div className="dash-chart-3d h-80 w-full">
          {data.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              No data for selected filters
            </div>
          ) : isAchievement ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={TEAL} />
                    <stop offset="100%" stopColor={PURPLE} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="displayLabel" tick={{ fill: TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: TICK, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(v) => [formatPercent(Number(v)), "Recovery"]} contentStyle={tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="url(#lineGrad)"
                  strokeWidth={3}
                  dot={{ r: 4, fill: TEAL, stroke: "#0B1120", strokeWidth: 2 }}
                  filter="url(#glow)"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : tab === "monthly" ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }} barCategoryGap="20%">
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={TEAL} stopOpacity={1} />
                    <stop offset="100%" stopColor={TEAL} stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="displayLabel" tick={{ fill: TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: TICK, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => [formatCurrency(Number(v)), "Collected"]} contentStyle={tooltipStyle} />
                <Bar dataKey="amount" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={TEAL} stopOpacity={0.4} />
                    <stop offset="50%" stopColor={PURPLE} stopOpacity={0.15} />
                    <stop offset="100%" stopColor={TEAL} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="displayLabel" tick={{ fill: TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: TICK, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => [formatCurrency(Number(v)), "Collected"]} contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke={TEAL}
                  strokeWidth={2}
                  fill="url(#areaGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Brush,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { TEAL, PURPLE, GRID, TICK, tooltipStyle } from "@/components/analytics/chart-theme";
import type { TrendSeries } from "@/lib/services";

interface TrendExplorerProps {
  data: TrendSeries;
}

type Period = "hourly" | "daily" | "weekly" | "monthly" | "last7" | "last30";
type ChartType = "line" | "area" | "bar";

const PERIOD_LABELS: Record<Period, string> = {
  hourly: "Hourly (Today)",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  last7: "Last 7 Days",
  last30: "Last 30 Days",
};

function displayLabel(period: Period, label: string) {
  if (period === "hourly") return label;
  if (period === "monthly") {
    return new Date(label + "-01").toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
  }
  return new Date(label).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function TrendExplorer({ data }: TrendExplorerProps) {
  const [period, setPeriod] = useState<Period>("daily");
  const [chartType, setChartType] = useState<ChartType>("area");

  const seriesMap: Record<Period, TrendSeries["daily"]> = {
    hourly: data.hourly,
    daily: data.daily,
    weekly: data.weekly,
    monthly: data.monthly,
    last7: data.last7,
    last30: data.last30,
  };

  const chartData = useMemo(
    () => seriesMap[period].map((d) => ({ ...d, displayLabel: displayLabel(period, d.label) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [period, data]
  );

  const yTickFormatter = (v: number) => `₹${(v / 1000).toFixed(0)}k`;
  const chartMargin = { top: 12, right: 12, left: 0, bottom: chartData.length > 8 ? 36 : 0 };
  const showBrush = chartData.length > 8;

  const brush = showBrush ? (
    <Brush dataKey="displayLabel" height={22} stroke={TEAL} fill="rgba(0,242,254,0.08)" travellerWidth={10} />
  ) : null;

  return (
    <Card variant="glass">
      <CardHeader variant="glass">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-white">Trend Analysis</h2>
            <p className="mt-0.5 text-sm text-slate-400">Hourly, daily, weekly &amp; monthly collection trends</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex rounded-xl border border-white/5 bg-white/5 p-1">
              {(["line", "area", "bar"] as ChartType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setChartType(t)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-medium capitalize transition ${
                    chartType === t ? "bg-gradient-to-r from-[#00F2FE]/20 to-violet-500/20 text-[#00F2FE]" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                period === p ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardBody>
        <div className="dash-chart-3d h-80 w-full">
          {chartData.length === 0 || chartData.every((d) => d.amount === 0) ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              No collection data for this period yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "bar" ? (
                <BarChart data={chartData} margin={chartMargin} barCategoryGap="20%">
                  <defs>
                    <linearGradient id="trendBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={TEAL} stopOpacity={1} />
                      <stop offset="100%" stopColor={TEAL} stopOpacity={0.3} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                  <XAxis dataKey="displayLabel" tick={{ fill: TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: TICK, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={yTickFormatter} />
                  <Tooltip formatter={(v) => [formatCurrency(Number(v)), "Collected"]} contentStyle={tooltipStyle} />
                  <Bar dataKey="amount" fill="url(#trendBarGrad)" radius={[6, 6, 0, 0]} />
                  {brush}
                </BarChart>
              ) : chartType === "line" ? (
                <LineChart data={chartData} margin={chartMargin}>
                  <defs>
                    <linearGradient id="trendLineGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={TEAL} />
                      <stop offset="100%" stopColor={PURPLE} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                  <XAxis dataKey="displayLabel" tick={{ fill: TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: TICK, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={yTickFormatter} />
                  <Tooltip formatter={(v) => [formatCurrency(Number(v)), "Collected"]} contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="amount" stroke="url(#trendLineGrad)" strokeWidth={3} dot={{ r: 3, fill: TEAL, stroke: "#0B1120", strokeWidth: 2 }} />
                  {brush}
                </LineChart>
              ) : (
                <AreaChart data={chartData} margin={chartMargin}>
                  <defs>
                    <linearGradient id="trendAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={TEAL} stopOpacity={0.4} />
                      <stop offset="50%" stopColor={PURPLE} stopOpacity={0.15} />
                      <stop offset="100%" stopColor={TEAL} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                  <XAxis dataKey="displayLabel" tick={{ fill: TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: TICK, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={yTickFormatter} />
                  <Tooltip formatter={(v) => [formatCurrency(Number(v)), "Collected"]} contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="amount" stroke={TEAL} strokeWidth={2} fill="url(#trendAreaGrad)" />
                  {brush}
                </AreaChart>
              )}
            </ResponsiveContainer>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-2">
          <div className="dash-clay rounded-2xl p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Month on Month</p>
            <p className="mt-2 text-lg font-bold text-white">{formatCurrency(data.monthOverMonth.current)}</p>
            <p className="mt-1 text-xs text-slate-500">
              vs {formatCurrency(data.monthOverMonth.previous)} last month ·{" "}
              <span className={data.monthOverMonth.changePercent >= 0 ? "text-emerald-400" : "text-rose-400"}>
                {data.monthOverMonth.changePercent >= 0 ? "+" : ""}
                {data.monthOverMonth.changePercent.toFixed(1)}%
              </span>
            </p>
          </div>
          <div className="dash-clay rounded-2xl p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Quarter on Quarter</p>
            <p className="mt-2 text-lg font-bold text-white">{formatCurrency(data.quarterOverQuarter.current)}</p>
            <p className="mt-1 text-xs text-slate-500">
              vs {formatCurrency(data.quarterOverQuarter.previous)} last quarter ·{" "}
              <span className={data.quarterOverQuarter.changePercent >= 0 ? "text-emerald-400" : "text-rose-400"}>
                {data.quarterOverQuarter.changePercent >= 0 ? "+" : ""}
                {data.quarterOverQuarter.changePercent.toFixed(1)}%
              </span>
            </p>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

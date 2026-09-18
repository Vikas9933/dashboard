"use client";

import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/format";
import { StatTile } from "@/components/analytics/stat-tile";
import type { ForecastResult } from "@/lib/services";

const riskCls: Record<ForecastResult["riskLevel"], string> = {
  low: "text-emerald-400",
  medium: "text-amber-400",
  high: "text-rose-400",
};

const riskTrack: Record<ForecastResult["riskLevel"], string> = {
  low: "from-emerald-500 to-emerald-300",
  medium: "from-amber-500 to-amber-300",
  high: "from-rose-500 to-rose-300",
};

export function ForecastPanel({ data }: { data: ForecastResult }) {
  return (
    <Card variant="glass">
      <CardHeader variant="glass">
        <h2 className="text-base font-semibold text-white">Forecasting</h2>
        <p className="mt-0.5 text-sm text-slate-400">Statistical projection blending run-rate and recent-day momentum</p>
      </CardHeader>
      <CardBody>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Expected Month End Collection" value={formatCurrency(data.monthEndCollection)} accent="teal" />
          <StatTile label="Expected Achievement" value={formatPercent(data.expectedAchievementPercent)} accent={data.expectedAchievementPercent >= 100 ? "emerald" : "amber"} />
          <StatTile label="Expected PTP" value={String(data.expectedPtp)} hint="Remaining days" accent="purple" />
          <StatTile label="Expected Broken PTP" value={String(data.expectedBrokenPtp)} accent="rose" />
        </div>

        <div className="mt-5 dash-clay rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Risk Score</p>
            <span className={`text-sm font-bold uppercase ${riskCls[data.riskLevel]}`}>{data.riskLevel}</span>
          </div>
          <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${riskTrack[data.riskLevel]} transition-all duration-500`}
              style={{ width: `${data.riskScore}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">{data.riskScore.toFixed(0)} / 100 — derived from target gap, broken-PTP ratio, and collection velocity.</p>
        </div>
      </CardBody>
    </Card>
  );
}

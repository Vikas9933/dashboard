"use client";

import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/format";
import { StatTile } from "@/components/analytics/stat-tile";
import type { ExecutiveSummary } from "@/lib/services";
import { AlertTriangle, ShieldCheck, ShieldAlert } from "lucide-react";

interface ExecutiveDashboardProps {
  data: ExecutiveSummary;
  kpiTargetPercent: number;
  onDrill?: (dimension: string) => void;
}

const riskConfig = {
  low: { label: "On Track", icon: ShieldCheck, cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  medium: { label: "At Risk", icon: ShieldAlert, cls: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  high: { label: "High Risk", icon: AlertTriangle, cls: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
};

export function ExecutiveDashboard({ data, kpiTargetPercent, onDrill }: ExecutiveDashboardProps) {
  const risk = riskConfig[data.riskOfMissingTarget];
  const RiskIcon = risk.icon;

  return (
    <Card variant="hero">
      <CardHeader variant="glass">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="dash-section-title text-base font-semibold text-white">Executive Dashboard</h2>
            <p className="mt-0.5 text-sm text-slate-400">
              Live snapshot · target set to {kpiTargetPercent}% of allocated portfolio · updates with filters
            </p>
          </div>
          <span className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${risk.cls}`}>
            <RiskIcon className="h-3.5 w-3.5" />
            {risk.label}
          </span>
        </div>
      </CardHeader>
      <CardBody>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatTile label="FTD Collection" value={formatCurrency(data.ftdCollection)} hint="Today" accent="teal" onClick={() => onDrill?.("today")} />
          <StatTile label="MTD Collection" value={formatCurrency(data.mtdCollection)} hint={`Day ${data.dayOfMonth}/${data.daysInMonth}`} accent="teal" onClick={() => onDrill?.("mtd")} />
          <StatTile label="Target" value={formatCurrency(data.target)} hint={`${kpiTargetPercent}% of allocated`} accent="purple" onClick={() => onDrill?.("target")} />
          <StatTile label="Achievement %" value={formatPercent(data.achievementPercent)} accent={data.achievementPercent >= kpiTargetPercent ? "emerald" : "amber"} onClick={() => onDrill?.("achievement")} />
          <StatTile label="Current DRR" value={formatCurrency(data.currentDrr)} hint="Per day, MTD avg" accent="teal" onClick={() => onDrill?.("drr")} />
          <StatTile label="Required DRR" value={formatCurrency(data.requiredDrr)} hint={`${data.daysRemaining} days left`} accent="amber" onClick={() => onDrill?.("required-drr")} />
          <StatTile label="Month End Projection" value={formatCurrency(data.monthEndProjection)} hint="Run-rate based" accent="purple" onClick={() => onDrill?.("projection")} />
          <StatTile
            label="Variance vs Target"
            value={`${data.varianceAgainstTarget >= 0 ? "+" : ""}${formatCurrency(data.varianceAgainstTarget)}`}
            accent={data.varianceAgainstTarget >= 0 ? "emerald" : "rose"}
            onClick={() => onDrill?.("variance")}
          />
          <StatTile label="Recovery Efficiency" value={formatPercent(data.recoveryEfficiency)} hint="Lifetime collected / allocated" accent="teal" onClick={() => onDrill?.("efficiency")} />
          <StatTile
            label="Collection Velocity"
            value={`${data.collectionVelocity >= 0 ? "+" : ""}${data.collectionVelocity.toFixed(1)}%`}
            hint="Last 7d vs prior 7d"
            accent={data.collectionVelocity >= 0 ? "emerald" : "rose"}
            onClick={() => onDrill?.("velocity")}
          />
        </div>
      </CardBody>
    </Card>
  );
}

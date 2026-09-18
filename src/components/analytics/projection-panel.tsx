"use client";

import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/format";
import { StatTile } from "@/components/analytics/stat-tile";
import type { ExecutiveSummary } from "@/lib/services";
import { AlertTriangle, ShieldAlert, ShieldCheck } from "lucide-react";

interface ProjectionPanelProps {
  data: ExecutiveSummary;
  kpiTargetPercent: number;
  onDrill?: () => void;
}

const riskConfig = {
  low: { label: "Low risk of missing target", icon: ShieldCheck, cls: "text-emerald-400" },
  medium: { label: "Medium risk — pace needs improvement", icon: ShieldAlert, cls: "text-amber-400" },
  high: { label: "High risk of missing target", icon: AlertTriangle, cls: "text-rose-400" },
};

export function ProjectionPanel({ data, kpiTargetPercent, onDrill }: ProjectionPanelProps) {
  const risk = riskConfig[data.riskOfMissingTarget];
  const RiskIcon = risk.icon;
  const projectedAchievement = data.target > 0 ? (data.monthEndProjection / data.target) * 100 : 0;

  return (
    <Card variant="glass">
      <CardHeader variant="glass">
        <h2 className="text-base font-semibold text-white">Projection Engine</h2>
        <p className="mt-0.5 text-sm text-slate-400">
          Auto-calculated from MTD run-rate · recalculates when filters change · target {kpiTargetPercent}%
        </p>
      </CardHeader>
      <CardBody>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <StatTile label="Current DRR" value={formatCurrency(data.currentDrr)} hint="MTD ÷ days elapsed" accent="teal" onClick={onDrill} />
          <StatTile label="Required DRR" value={formatCurrency(data.requiredDrr)} hint={`${data.daysRemaining} days remaining`} accent="amber" onClick={onDrill} />
          <StatTile
            label="Projected Collection"
            value={formatCurrency(data.currentDrr * data.daysInMonth)}
            hint="Current DRR × month days"
            accent="purple"
            onClick={onDrill}
          />
          <StatTile label="Expected Month End Collection" value={formatCurrency(data.monthEndProjection)} hint="Run-rate projection" accent="teal" onClick={onDrill} />
          <StatTile label="Target Achievement %" value={formatPercent(projectedAchievement)} accent={projectedAchievement >= kpiTargetPercent ? "emerald" : "rose"} onClick={onDrill} />
          <StatTile label="Variance vs Target" value={`${data.varianceAgainstTarget >= 0 ? "+" : ""}${formatCurrency(data.varianceAgainstTarget)}`} accent={data.varianceAgainstTarget >= 0 ? "emerald" : "rose"} onClick={onDrill} />
        </div>

        <div className={`mt-5 flex items-center gap-3 rounded-2xl border border-white/5 bg-white/5 p-4 ${risk.cls}`}>
          <RiskIcon className="h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-white">Risk of Missing Target</p>
            <p className="mt-0.5 text-xs text-slate-400">{risk.label}</p>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

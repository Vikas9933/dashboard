"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/format";
import { bandColorHex } from "@/components/analytics/chart-theme";
import type { ProductivityRankings, RankedEntity } from "@/lib/services";

type HeatmapDim = "stateRanking" | "cityRanking" | "agencyRanking" | "teamRanking";

const DIM_LABELS: Record<HeatmapDim, string> = {
  stateRanking: "State Wise Collection",
  cityRanking: "City Wise Collection",
  agencyRanking: "Agency Wise Collection",
  teamRanking: "Branch Wise Collection",
};

function HeatCell({ entity }: { entity: RankedEntity }) {
  const color = bandColorHex(entity.colorBand);
  return (
    <div
      className="rounded-xl border p-3 transition-transform hover:-translate-y-0.5"
      style={{ background: `${color}1a`, borderColor: `${color}40` }}
    >
      <p className="truncate text-sm font-semibold text-white">{entity.name}</p>
      <p className="mt-1 text-xs text-slate-400">{formatCurrency(entity.collected)}</p>
      <p className="mt-1 text-sm font-bold" style={{ color }}>
        {formatPercent(entity.achievement)}
      </p>
    </div>
  );
}

export function RecoveryHeatmap({ data }: { data: ProductivityRankings }) {
  const [dim, setDim] = useState<HeatmapDim>("stateRanking");
  const rows = [...data[dim]].sort((a, b) => b.achievement - a.achievement);

  return (
    <Card variant="glass">
      <CardHeader variant="glass">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-white">Recovery Heatmap</h2>
            <p className="mt-0.5 text-sm text-slate-400">Green = on target · Yellow = at risk · Red = underperforming</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(DIM_LABELS) as HeatmapDim[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDim(d)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  dim === d ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                {DIM_LABELS[d]}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardBody>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">No data for the selected filters</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {rows.map((r) => (
              <HeatCell key={r.key} entity={r} />
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

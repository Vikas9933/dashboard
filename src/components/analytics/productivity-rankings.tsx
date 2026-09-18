"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/format";
import { StatTile } from "@/components/analytics/stat-tile";
import type { ProductivityRankings as ProductivityRankingsData, RankedEntity } from "@/lib/services";

type RankTab = "agentRanking" | "tlRanking" | "agencyRanking" | "stateRanking" | "cityRanking" | "teamRanking";

const TAB_LABELS: Record<RankTab, string> = {
  agentRanking: "Agent Ranking",
  tlRanking: "TL Ranking",
  agencyRanking: "Agency Ranking",
  teamRanking: "Branch Ranking",
  stateRanking: "State Ranking",
  cityRanking: "City Ranking",
};

const bandDot: Record<RankedEntity["colorBand"], string> = {
  green: "bg-emerald-400",
  yellow: "bg-amber-400",
  red: "bg-rose-400",
};

export function ProductivityRankingsPanel({
  data,
  onDrill,
}: {
  data: ProductivityRankingsData;
  onDrill?: (dimension: RankTab, key: string, name: string) => void;
}) {
  const [tab, setTab] = useState<RankTab>("agentRanking");
  const rows = data[tab];

  return (
    <Card variant="glass">
      <CardHeader variant="glass">
        <h2 className="text-base font-semibold text-white">Productivity Analytics</h2>
        <p className="mt-0.5 text-sm text-slate-400">Rankings across agents, TLs, agencies, branches, states &amp; cities</p>
      </CardHeader>
      <CardBody>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatTile label="Best Performer" value={data.bestPerformer?.name ?? "—"} hint={data.bestPerformer ? formatPercent(data.bestPerformer.achievement) : undefined} accent="emerald" />
          <StatTile label="Worst Performer" value={data.worstPerformer?.name ?? "—"} hint={data.worstPerformer ? formatPercent(data.worstPerformer.achievement) : undefined} accent="rose" />
          <StatTile label="Average Productivity" value={formatPercent(data.avgProductivity)} hint="Across all agents" accent="teal" />
        </div>

        <div className="mt-5 mb-2 flex flex-wrap gap-1.5">
          {(Object.keys(TAB_LABELS) as RankTab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                tab === t ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        <div className="max-h-96 overflow-y-auto rounded-xl border border-white/5">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white/5 text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-3 py-2 text-left">Rank</th>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-right">Accounts</th>
                <th className="px-3 py-2 text-right">Allocated</th>
                <th className="px-3 py-2 text-right">Collected</th>
                <th className="px-3 py-2 text-right">Achievement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                    No data for the selected filters
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.key}
                    onClick={() => onDrill?.(tab, r.key, r.name)}
                    className={`text-slate-300 ${onDrill ? "cursor-pointer hover:bg-white/5" : ""}`}
                  >
                    <td className="px-3 py-2 font-semibold text-white">#{r.rank}</td>
                    <td className="px-3 py-2">
                      <span className={`mr-2 inline-block h-2 w-2 rounded-full ${bandDot[r.colorBand]}`} />
                      {r.name}
                    </td>
                    <td className="px-3 py-2 text-right">{r.accounts}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(r.allocated)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(r.collected)}</td>
                    <td className="px-3 py-2 text-right">{formatPercent(r.achievement)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}

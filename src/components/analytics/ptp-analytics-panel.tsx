"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/format";
import { StatTile } from "@/components/analytics/stat-tile";
import { EMERALD, ROSE, TICK, GRID, tooltipStyle } from "@/components/analytics/chart-theme";
import type { PtpAnalytics, PtpGroupStat } from "@/lib/services";

type GroupTab = "agentWise" | "teamWise" | "bucketWise";

const GROUP_LABELS: Record<GroupTab, string> = {
  agentWise: "Agent Wise",
  teamWise: "Team / Branch Wise",
  bucketWise: "Bucket Wise",
};

function GroupTable({ rows }: { rows: PtpGroupStat[] }) {
  return (
    <div className="max-h-72 overflow-y-auto rounded-xl border border-white/5">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-white/5 text-xs uppercase tracking-wider text-slate-400">
          <tr>
            <th className="px-3 py-2 text-left">Name</th>
            <th className="px-3 py-2 text-right">Total PTP</th>
            <th className="px-3 py-2 text-right">Amount</th>
            <th className="px-3 py-2 text-right">Kept</th>
            <th className="px-3 py-2 text-right">Broken</th>
            <th className="px-3 py-2 text-right">Conv %</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                No PTP data yet
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.key} className="text-slate-300">
                <td className="px-3 py-2 font-medium text-white">{r.name}</td>
                <td className="px-3 py-2 text-right">{r.total}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(r.amount)}</td>
                <td className="px-3 py-2 text-right text-emerald-400">{r.kept}</td>
                <td className="px-3 py-2 text-right text-rose-400">{r.broken}</td>
                <td className="px-3 py-2 text-right">{formatPercent(r.conversionPercent)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function PtpAnalyticsPanel({ data }: { data: PtpAnalytics }) {
  const [group, setGroup] = useState<GroupTab>("agentWise");
  const groupData: Record<GroupTab, PtpGroupStat[]> = {
    agentWise: data.agentWise,
    teamWise: data.teamWise,
    bucketWise: data.bucketWise,
  };

  const trendData = data.dailyTrend.map((d) => ({
    ...d,
    displayLabel: new Date(d.label).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
  }));

  return (
    <Card variant="glass">
      <CardHeader variant="glass">
        <h2 className="text-base font-semibold text-white">PTP Analytics</h2>
        <p className="mt-0.5 text-sm text-slate-400">Promise-to-Pay tracking &amp; conversion</p>
      </CardHeader>
      <CardBody>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Total PTP" value={String(data.totalPtp)} accent="teal" />
          <StatTile label="PTP Amount" value={formatCurrency(data.ptpAmount)} accent="teal" />
          <StatTile label="Today's Due PTP" value={String(data.todayDue)} accent="amber" />
          <StatTile label="Tomorrow Due PTP" value={String(data.tomorrowDue)} accent="amber" />
          <StatTile label="Kept PTP" value={String(data.kept)} accent="emerald" />
          <StatTile label="Broken PTP" value={String(data.broken)} accent="rose" />
          <StatTile label="Pending PTP" value={String(data.pending)} accent="slate" />
          <StatTile label="PTP Conversion %" value={formatPercent(data.conversionPercent)} accent={data.conversionPercent >= 50 ? "emerald" : "rose"} />
        </div>

        <div className="mt-5">
          <p className="mb-2 text-sm font-semibold text-white">Daily PTP Trend</p>
          <div className="dash-chart-3d h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="displayLabel" tick={{ fill: TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: TICK, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11, color: TICK }} />
                <Bar dataKey="kept" name="Kept" stackId="s" fill={EMERALD} radius={[0, 0, 0, 0]} />
                <Bar dataKey="broken" name="Broken" stackId="s" fill={ROSE} radius={[0, 0, 0, 0]} />
                <Bar dataKey="pending" name="Pending" stackId="s" fill="rgba(148,163,184,0.4)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {(Object.keys(GROUP_LABELS) as GroupTab[]).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGroup(g)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  group === g ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                {GROUP_LABELS[g]}
              </button>
            ))}
          </div>
          <GroupTable rows={groupData[group]} />
        </div>
      </CardBody>
    </Card>
  );
}

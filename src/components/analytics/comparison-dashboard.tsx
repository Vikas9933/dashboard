"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/format";
import { TEAL, PURPLE, TICK, GRID, tooltipStyle } from "@/components/analytics/chart-theme";
import type { ComparisonDashboardData, ComparisonPair, ProductivityRankings } from "@/lib/services";

function PairCard({ pair }: { pair: ComparisonPair }) {
  const data = [
    { label: "Previous", amount: pair.previous },
    { label: "Current", amount: pair.current },
  ];
  return (
    <div className="dash-clay rounded-2xl p-4">
      <p className="text-sm font-semibold text-white">{pair.label}</p>
      <p className="mt-1 text-xs text-slate-500">
        {formatCurrency(pair.current)} vs {formatCurrency(pair.previous)} ·{" "}
        <span className={pair.changePercent >= 0 ? "text-emerald-400" : "text-rose-400"}>
          {pair.changePercent >= 0 ? "+" : ""}
          {pair.changePercent.toFixed(1)}%
        </span>
      </p>
      <div className="mt-3 h-28 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fill: TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip formatter={(v) => [formatCurrency(Number(v)), "Amount"]} contentStyle={tooltipStyle} />
            <Bar dataKey="amount" fill={TEAL} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

type EntityDim = "agentRanking" | "tlRanking" | "agencyRanking";
const ENTITY_LABELS: Record<EntityDim, string> = {
  agentRanking: "Agent vs Agent",
  tlRanking: "TL vs TL",
  agencyRanking: "Agency vs Agency",
};

function Metric({ label, a, b, fmt }: { label: string; a: number; b: number; fmt: (v: number) => string }) {
  const aWins = a >= b;
  return (
    <div className="grid grid-cols-3 items-center gap-2 py-1.5 text-sm">
      <span className={`text-right font-semibold ${aWins ? "text-emerald-400" : "text-slate-300"}`}>{fmt(a)}</span>
      <span className="text-center text-xs uppercase tracking-wider text-slate-500">{label}</span>
      <span className={`text-left font-semibold ${!aWins ? "text-emerald-400" : "text-slate-300"}`}>{fmt(b)}</span>
    </div>
  );
}

const identityFmt = (v: number) => String(v);

function EntityComparison({ productivity }: { productivity: ProductivityRankings }) {
  const [dim, setDim] = useState<EntityDim>("agentRanking");
  const rows = productivity[dim];
  const [leftKey, setLeftKey] = useState<string>("");
  const [rightKey, setRightKey] = useState<string>("");

  const left = useMemo(() => rows.find((r) => r.key === leftKey) ?? rows[0], [rows, leftKey]);
  const right = useMemo(() => rows.find((r) => r.key === rightKey) ?? rows[1], [rows, rightKey]);

  const selectClass =
    "min-w-[160px] rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 outline-none transition focus:border-[#00F2FE]/40";

  return (
    <Card variant="glass">
      <CardHeader variant="glass">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-white">Entity Comparison</h2>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(ENTITY_LABELS) as EntityDim[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => {
                  setDim(d);
                  setLeftKey("");
                  setRightKey("");
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  dim === d ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                {ENTITY_LABELS[d]}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardBody>
        {rows.length < 2 ? (
          <p className="py-6 text-center text-sm text-slate-500">Not enough data to compare.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <select className={selectClass} value={left?.key} onChange={(e) => setLeftKey(e.target.value)}>
                {rows.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.name}
                  </option>
                ))}
              </select>
              <span className="text-sm font-bold text-slate-500">VS</span>
              <select className={selectClass} value={right?.key} onChange={(e) => setRightKey(e.target.value)}>
                {rows.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            {left && right && (
              <div className="mx-auto mt-5 max-w-lg">
                <div className="mb-2 grid grid-cols-3 text-center text-sm font-semibold text-white">
                  <span>{left.name}</span>
                  <span />
                  <span>{right.name}</span>
                </div>
                <Metric label="Accounts" a={left.accounts} b={right.accounts} fmt={identityFmt} />
                <Metric label="Allocated" a={left.allocated} b={right.allocated} fmt={formatCurrency} />
                <Metric label="Collected" a={left.collected} b={right.collected} fmt={formatCurrency} />
                <Metric label="Achievement" a={left.achievement} b={right.achievement} fmt={formatPercent} />
              </div>
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
}

function BucketComparison({ data }: { data: ComparisonDashboardData["bucketVsBucket"] }) {
  return (
    <Card variant="glass">
      <CardHeader variant="glass">
        <h2 className="text-base font-semibold text-white">Bucket vs Bucket</h2>
      </CardHeader>
      <CardBody>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
              <XAxis dataKey="bucket" tick={{ fill: TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: TICK, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value, name) => [formatCurrency(Number(value)), name === "collected" ? "Collected" : "Allocated"]}
                contentStyle={tooltipStyle}
              />
              <Bar dataKey="allocated" fill="rgba(148,163,184,0.25)" radius={[4, 4, 0, 0]} name="allocated" />
              <Bar dataKey="collected" fill={PURPLE} radius={[4, 4, 0, 0]} name="collected" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  );
}

export function ComparisonDashboardPanel({
  comparisons,
  productivity,
}: {
  comparisons: ComparisonDashboardData;
  productivity: ProductivityRankings;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <PairCard pair={comparisons.todayVsYesterday} />
        <PairCard pair={comparisons.thisWeekVsLastWeek} />
        <PairCard pair={comparisons.thisMonthVsLastMonth} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <EntityComparison productivity={productivity} />
        <BucketComparison data={comparisons.bucketVsBucket} />
      </div>
    </div>
  );
}

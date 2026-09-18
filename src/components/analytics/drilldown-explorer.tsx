"use client";

import { useMemo, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { ChevronRight, Home } from "lucide-react";
import type { FlatAccountRow } from "@/lib/services";

/** Collection → State → City → Branch → Agency → TL → Agent → Customer */
export type DrillLevel = "state" | "city" | "branch" | "agency" | "tl" | "agent" | "customer";

const LEVELS: { id: DrillLevel; label: string }[] = [
  { id: "state", label: "State" },
  { id: "city", label: "City" },
  { id: "branch", label: "Branch" },
  { id: "agency", label: "Agency" },
  { id: "tl", label: "TL" },
  { id: "agent", label: "Agent" },
  { id: "customer", label: "Customer" },
];

export interface DrillPathStep {
  level: DrillLevel;
  value: string;
}

function fieldForLevel(row: FlatAccountRow, level: DrillLevel): string {
  switch (level) {
    case "state":
      return row.state;
    case "city":
      return row.city;
    case "branch":
      return row.team;
    case "agency":
      return row.agency;
    case "tl":
      return row.tl;
    case "agent":
      return row.agent;
    case "customer":
      return row.id;
    default:
      return "Unknown";
  }
}

export function DrilldownExplorer({ rows, initialPath = [] }: { rows: FlatAccountRow[]; initialPath?: DrillPathStep[] }) {
  const [path, setPath] = useState<DrillPathStep[]>(initialPath);

  const scopedRows = useMemo(() => {
    return rows.filter((r) =>
      path.every((step) => {
        if (step.level === "customer") return r.id === step.value;
        return fieldForLevel(r, step.level) === step.value;
      })
    );
  }, [rows, path]);

  const currentLevel = LEVELS[path.length]?.id;

  const grouped = useMemo(() => {
    if (!currentLevel) return [];
    if (currentLevel === "customer") {
      return scopedRows.slice(0, 200).map((r) => ({
        key: r.id,
        name: `${r.customerName} (${r.loanNumber})`,
        accounts: 1,
        allocated: r.allocated,
        collected: r.collected,
        achievement: r.allocated > 0 ? (r.collected / r.allocated) * 100 : 0,
      }));
    }
    const map = new Map<string, { allocated: number; collected: number; accounts: number }>();
    for (const r of scopedRows) {
      const key = fieldForLevel(r, currentLevel);
      const c = map.get(key) ?? { allocated: 0, collected: 0, accounts: 0 };
      map.set(key, {
        allocated: c.allocated + r.allocated,
        collected: c.collected + r.collected,
        accounts: c.accounts + 1,
      });
    }
    return Array.from(map.entries())
      .map(([key, s]) => ({
        key,
        name: key,
        accounts: s.accounts,
        allocated: s.allocated,
        collected: s.collected,
        achievement: s.allocated > 0 ? (s.collected / s.allocated) * 100 : 0,
      }))
      .sort((a, b) => b.collected - a.collected);
  }, [scopedRows, currentLevel]);

  function drillInto(value: string) {
    if (!currentLevel) return;
    setPath((p) => [...p, { level: currentLevel, value }]);
  }

  function jumpTo(index: number) {
    setPath((p) => p.slice(0, index));
  }

  const totalCollected = scopedRows.reduce((s, r) => s + r.collected, 0);

  return (
    <Card variant="glass">
      <CardHeader variant="glass">
        <h2 className="text-base font-semibold text-white">Drill Down Explorer</h2>
        <p className="mt-0.5 text-sm text-slate-400">
          Collection → State → City → Branch → Agency → TL → Agent → Customer
        </p>
      </CardHeader>
      <CardBody>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="dash-clay rounded-xl px-4 py-2">
            <p className="text-xs text-slate-500">Collection at this level</p>
            <p className="text-lg font-bold text-white">{formatCurrency(totalCollected)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-1 text-sm">
            <button type="button" onClick={() => jumpTo(0)} className="flex items-center gap-1 rounded-lg px-2 py-1 text-slate-400 hover:bg-white/5 hover:text-white">
              <Home className="h-3.5 w-3.5" />
              Collection
            </button>
            {path.map((step, i) => (
              <span key={i} className="flex items-center gap-1">
                <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
                <button type="button" onClick={() => jumpTo(i + 1)} className="rounded-lg px-2 py-1 text-slate-300 hover:bg-white/5 hover:text-white">
                  {step.value}
                </button>
              </span>
            ))}
          </div>
        </div>

        {!currentLevel ? (
          <p className="py-6 text-center text-sm text-slate-500">Customer-level detail — end of drill path.</p>
        ) : grouped.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">No records at this level for the selected filters.</p>
        ) : (
          <div className="max-h-96 overflow-y-auto rounded-xl border border-white/5">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white/5 text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-3 py-2 text-left">{LEVELS.find((l) => l.id === currentLevel)?.label}</th>
                  <th className="px-3 py-2 text-right">Accounts</th>
                  <th className="px-3 py-2 text-right">Allocated</th>
                  <th className="px-3 py-2 text-right">Collected</th>
                  <th className="px-3 py-2 text-right">Achievement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {grouped.map((g) => (
                  <tr
                    key={g.key}
                    onClick={() => currentLevel !== "customer" && drillInto(g.key)}
                    className={`text-slate-300 ${currentLevel !== "customer" ? "cursor-pointer hover:bg-white/5" : ""}`}
                  >
                    <td className="px-3 py-2 font-medium text-white">{g.name}</td>
                    <td className="px-3 py-2 text-right">{formatNumber(g.accounts)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(g.allocated)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(g.collected)}</td>
                    <td className="px-3 py-2 text-right">{formatPercent(g.achievement)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

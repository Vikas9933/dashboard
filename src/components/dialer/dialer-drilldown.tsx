"use client";

import { useMemo, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatCurrency, formatDuration, formatNumber } from "@/lib/format";
import { ChevronRight, Home } from "lucide-react";
import type { DialerCaseRow } from "@/lib/services/dialer-performance-service";

export type DialerDrillLevel = "client" | "bank" | "product" | "agency" | "tl" | "agent" | "customer";

export interface DialerPathStep {
  level: DialerDrillLevel;
  value: string;
}

const LEVELS: { id: DialerDrillLevel; label: string }[] = [
  { id: "client", label: "Client" },
  { id: "bank", label: "Bank" },
  { id: "product", label: "Product" },
  { id: "agency", label: "Agency" },
  { id: "tl", label: "TL" },
  { id: "agent", label: "Agent" },
  { id: "customer", label: "Customer / Case" },
];

function fieldForLevel(row: DialerCaseRow, level: DialerDrillLevel): string {
  switch (level) {
    case "client":
      return row.client;
    case "bank":
      return row.bank;
    case "product":
      return row.product;
    case "agency":
      return row.agency;
    case "tl":
      return row.tl;
    case "agent":
      return row.agent;
    case "customer":
      return row.accountId;
    default:
      return "Unknown";
  }
}

export function DialerDrilldown({
  rows,
  initialPath = [],
}: {
  rows: DialerCaseRow[];
  initialPath?: DialerPathStep[];
}) {
  const [path, setPath] = useState<DialerPathStep[]>(initialPath);

  const scopedRows = useMemo(() => {
    return rows.filter((r) =>
      path.every((step) => {
        if (step.level === "customer") return r.accountId === step.value;
        return fieldForLevel(r, step.level) === step.value;
      })
    );
  }, [rows, path]);

  const currentLevel = LEVELS[path.length]?.id;

  const grouped = useMemo(() => {
    if (!currentLevel) return [];
    if (currentLevel === "customer") {
      return scopedRows.slice(0, 250).map((r) => ({
        key: r.accountId,
        name: `${r.customerName} (${r.loanNumber})`,
        allocated: 1,
        attempted: r.callsAttempted,
        connected: r.connectedCalls,
        notConnected: Math.max(0, r.callsAttempted - r.connectedCalls),
        rpc: r.rpcCount,
        ptp: r.ptpGenerated,
        ptpAmount: r.ptpAmount,
        broken: r.brokenPtp,
        followUp: r.followUp ? 1 : 0,
        resolved: r.resolved ? 1 : 0,
        resolution: r.resolutionAmount,
        duration: r.callDurationSeconds,
      }));
    }
    const map = new Map<
      string,
      {
        allocated: number;
        attempted: number;
        connected: number;
        notConnected: number;
        rpc: number;
        ptp: number;
        ptpAmount: number;
        broken: number;
        followUp: number;
        resolved: number;
        resolution: number;
        duration: number;
      }
    >();
    for (const r of scopedRows) {
      const key = fieldForLevel(r, currentLevel);
      const c = map.get(key) ?? {
        allocated: 0,
        attempted: 0,
        connected: 0,
        notConnected: 0,
        rpc: 0,
        ptp: 0,
        ptpAmount: 0,
        broken: 0,
        followUp: 0,
        resolved: 0,
        resolution: 0,
        duration: 0,
      };
      map.set(key, {
        allocated: c.allocated + 1,
        attempted: c.attempted + r.callsAttempted,
        connected: c.connected + r.connectedCalls,
        notConnected: c.notConnected + Math.max(0, r.callsAttempted - r.connectedCalls),
        rpc: c.rpc + r.rpcCount,
        ptp: c.ptp + r.ptpGenerated,
        ptpAmount: c.ptpAmount + r.ptpAmount,
        broken: c.broken + r.brokenPtp,
        followUp: c.followUp + (r.followUp ? 1 : 0),
        resolved: c.resolved + (r.resolved ? 1 : 0),
        resolution: c.resolution + r.resolutionAmount,
        duration: c.duration + r.callDurationSeconds,
      });
    }
    return Array.from(map.entries())
      .map(([key, s]) => ({ key, name: key, ...s }))
      .sort((a, b) => b.attempted - a.attempted);
  }, [scopedRows, currentLevel]);

  function drillInto(value: string) {
    if (!currentLevel) return;
    setPath((p) => [...p, { level: currentLevel, value }]);
  }

  function jumpTo(index: number) {
    setPath((p) => p.slice(0, index));
  }

  return (
    <Card variant="glass">
      <CardHeader variant="glass">
        <h2 className="text-base font-semibold text-white">Accountability drill-down</h2>
        <p className="mt-0.5 text-sm text-slate-400">
          Client → Bank → Product → Agency → TL → Agent → Customer / Case
        </p>
      </CardHeader>
      <CardBody>
        <div className="mb-4 flex flex-wrap items-center gap-1 text-sm">
          <button type="button" onClick={() => jumpTo(0)} className="flex items-center gap-1 rounded-lg px-2 py-1 text-slate-400 hover:bg-white/5 hover:text-white">
            <Home className="h-3.5 w-3.5" />
            Portfolio
          </button>
          {path.map((step, i) => (
            <span key={`${step.level}-${step.value}`} className="flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
              <button type="button" onClick={() => jumpTo(i + 1)} className="rounded-lg px-2 py-1 text-slate-300 hover:bg-white/5 hover:text-white">
                {step.value}
              </button>
            </span>
          ))}
        </div>

        {!currentLevel ? (
          <p className="py-6 text-center text-sm text-slate-500">End of drill path.</p>
        ) : grouped.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">No records at this level.</p>
        ) : (
          <div className="max-h-96 overflow-auto rounded-xl border border-white/5">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="sticky top-0 bg-white/5 text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-3 py-2 text-left">{LEVELS.find((l) => l.id === currentLevel)?.label}</th>
                  <th className="px-3 py-2 text-right">Cases</th>
                  <th className="px-3 py-2 text-right">Attempted</th>
                  <th className="px-3 py-2 text-right">Connected</th>
                  <th className="px-3 py-2 text-right">Not connected</th>
                  <th className="px-3 py-2 text-right">RPC</th>
                  <th className="px-3 py-2 text-right">PTP</th>
                  <th className="px-3 py-2 text-right">Follow-up</th>
                  <th className="px-3 py-2 text-right">Resolved</th>
                  <th className="px-3 py-2 text-right">Resolution</th>
                  <th className="px-3 py-2 text-right">Talk time</th>
                </tr>
              </thead>
              <tbody>
                {grouped.map((row) => (
                  <tr
                    key={row.key}
                    className="cursor-pointer border-t border-white/5 hover:bg-white/5"
                    onClick={() => drillInto(row.key)}
                  >
                    <td className="px-3 py-2 font-medium text-white">{row.name}</td>
                    <td className="px-3 py-2 text-right text-slate-300">{formatNumber(row.allocated)}</td>
                    <td className="px-3 py-2 text-right text-slate-300">{formatNumber(row.attempted)}</td>
                    <td className="px-3 py-2 text-right text-slate-300">{formatNumber(row.connected)}</td>
                    <td className="px-3 py-2 text-right text-rose-300">{formatNumber(row.notConnected)}</td>
                    <td className="px-3 py-2 text-right text-slate-300">{formatNumber(row.rpc)}</td>
                    <td className="px-3 py-2 text-right text-slate-300">{formatNumber(row.ptp)}</td>
                    <td className="px-3 py-2 text-right text-slate-300">{formatNumber(row.followUp)}</td>
                    <td className="px-3 py-2 text-right text-emerald-300">{formatNumber(row.resolved)}</td>
                    <td className="px-3 py-2 text-right text-emerald-300">{formatCurrency(row.resolution)}</td>
                    <td className="px-3 py-2 text-right text-slate-300">{formatDuration(row.duration)}</td>
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

"use client";

import { useMemo, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatCurrency, formatDuration, formatNumber } from "@/lib/format";
import type { DialerAccountabilityGaps } from "@/lib/services/dialer-metrics";
import type { DialerCaseRow } from "@/lib/services/dialer-performance-service";

type CaseFilter = "all" | keyof DialerAccountabilityGaps | "resolved" | "followUp";

function matchesFilter(row: DialerCaseRow, filter: CaseFilter): boolean {
  switch (filter) {
    case "unworkedCases":
      return row.callsAttempted === 0;
    case "calledNotConnected":
      return row.callsAttempted > 0 && row.connectedCalls === 0;
    case "connectedNoRpc":
      return row.connectedCalls > 0 && row.rpcCount === 0;
    case "rpcNoPtp":
      return row.rpcCount > 0 && row.ptpGenerated === 0;
    case "ptpNoResolution":
      return row.ptpGenerated > 0 && !row.resolved;
    case "resolvedWithoutCall":
      return row.resolved && row.callsAttempted === 0;
    case "resolved":
      return row.resolved;
    case "followUp":
      return row.followUp;
    default:
      return true;
  }
}

export function DialerCasesTable({
  rows,
  filter = "all",
}: {
  rows: DialerCaseRow[];
  filter?: CaseFilter;
}) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((row) => matchesFilter(row, filter))
      .filter((row) => {
        if (!q) return true;
        return [row.customerName, row.loanNumber, row.agent, row.client, row.bank].some((v) =>
          v.toLowerCase().includes(q)
        );
      })
      .slice(0, 300);
  }, [rows, filter, query]);

  return (
    <Card variant="glass">
      <CardHeader variant="glass">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-white">Customer / case activity</h2>
            <p className="mt-0.5 text-sm text-slate-400">
              Calling volume next to PTP and payment so each allocated case is accountable.
            </p>
          </div>
          <input
            className="min-w-[200px] rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 outline-none focus:border-[#00F2FE]/40"
            placeholder="Search loan, customer, agent"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardBody className="overflow-x-auto p-0 sm:p-0">
        {visible.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">No cases match this view.</p>
        ) : (
          <div className="max-h-[28rem] overflow-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="sticky top-0 bg-[#111827] text-[11px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-3 py-2 text-left">Customer / loan</th>
                  <th className="px-3 py-2 text-left">Agent</th>
                  <th className="px-3 py-2 text-right">Allocated</th>
                  <th className="px-3 py-2 text-right">Attempted</th>
                  <th className="px-3 py-2 text-right">Connected</th>
                  <th className="px-3 py-2 text-right">RPC</th>
                  <th className="px-3 py-2 text-right">PTP</th>
                  <th className="px-3 py-2 text-right">Talk time</th>
                  <th className="px-3 py-2 text-right">Resolved</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr key={row.accountId} className="border-t border-white/5">
                    <td className="px-3 py-2">
                      <p className="font-medium text-white">{row.customerName}</p>
                      <p className="text-xs text-slate-500">{row.loanNumber}</p>
                    </td>
                    <td className="px-3 py-2 text-slate-300">
                      {row.agent}
                      <p className="text-xs text-slate-500">{row.tl}</p>
                    </td>
                    <td className="px-3 py-2 text-right text-slate-300">{formatCurrency(row.allocatedAmount)}</td>
                    <td className="px-3 py-2 text-right text-slate-300">{formatNumber(row.callsAttempted)}</td>
                    <td className="px-3 py-2 text-right text-slate-300">{formatNumber(row.connectedCalls)}</td>
                    <td className="px-3 py-2 text-right text-slate-300">{formatNumber(row.rpcCount)}</td>
                    <td className="px-3 py-2 text-right text-slate-300">
                      {formatNumber(row.ptpGenerated)}
                      <p className="text-xs text-slate-500">{formatCurrency(row.ptpAmount)}</p>
                    </td>
                    <td className="px-3 py-2 text-right text-slate-300">{formatDuration(row.callDurationSeconds)}</td>
                    <td className="px-3 py-2 text-right">
                      {row.resolved ? (
                        <span className="text-emerald-300">{formatCurrency(row.resolutionAmount)}</span>
                      ) : (
                        <span className="text-slate-500">Open</span>
                      )}
                    </td>
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

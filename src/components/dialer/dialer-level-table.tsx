"use client";

import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatCurrency, formatDuration, formatNumber, formatPercent } from "@/lib/format";
import type { DialerEntityRow } from "@/lib/services/dialer-performance-service";

export function DialerLevelTable({
  title,
  subtitle,
  rows,
  onSelect,
}: {
  title: string;
  subtitle: string;
  rows: DialerEntityRow[];
  onSelect?: (name: string) => void;
}) {
  return (
    <Card variant="glass">
      <CardHeader variant="glass">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        <p className="mt-0.5 text-sm text-slate-400">{subtitle}</p>
      </CardHeader>
      <CardBody className="overflow-x-auto p-0 sm:p-0">
        {rows.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">No records at this level for the current filters.</p>
        ) : (
          <div className="max-h-[28rem] overflow-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="sticky top-0 bg-[#111827] text-[11px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-right">Allocated</th>
                  <th className="px-3 py-2 text-right">Attempted</th>
                  <th className="px-3 py-2 text-right">Connected</th>
                  <th className="px-3 py-2 text-right">Not conn.</th>
                  <th className="px-3 py-2 text-right">RPC</th>
                  <th className="px-3 py-2 text-right">PTP</th>
                  <th className="px-3 py-2 text-right">PTP amt</th>
                  <th className="px-3 py-2 text-right">Conv</th>
                  <th className="px-3 py-2 text-right">Broken</th>
                  <th className="px-3 py-2 text-right">Duration</th>
                  <th className="px-3 py-2 text-right">Follow-up</th>
                  <th className="px-3 py-2 text-right">Resolved</th>
                  <th className="px-3 py-2 text-right">Resolution</th>
                  <th className="px-3 py-2 text-right">Productivity</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className={`border-t border-white/5 ${onSelect ? "cursor-pointer hover:bg-white/5" : ""}`}
                    onClick={() => onSelect?.(row.name)}
                  >
                    <td className="px-3 py-2 font-medium text-white">{row.name}</td>
                    <td className="px-3 py-2 text-right text-slate-300">{formatNumber(row.allocatedCases)}</td>
                    <td className="px-3 py-2 text-right text-slate-300">{formatNumber(row.callsAttempted)}</td>
                    <td className="px-3 py-2 text-right text-slate-300">{formatNumber(row.connectedCalls)}</td>
                    <td className="px-3 py-2 text-right text-rose-300">{formatNumber(row.notConnectedCalls)}</td>
                    <td className="px-3 py-2 text-right text-slate-300">{formatNumber(row.rpcCount)}</td>
                    <td className="px-3 py-2 text-right text-slate-300">{formatNumber(row.ptpGenerated)}</td>
                    <td className="px-3 py-2 text-right text-slate-300">{formatCurrency(row.ptpAmount)}</td>
                    <td className="px-3 py-2 text-right text-slate-300">{formatPercent(row.ptpConversion)}</td>
                    <td className="px-3 py-2 text-right text-rose-300">{formatNumber(row.brokenPtp)}</td>
                    <td className="px-3 py-2 text-right text-slate-300">{formatDuration(row.callDurationSeconds)}</td>
                    <td className="px-3 py-2 text-right text-slate-300">{formatNumber(row.followUpCases)}</td>
                    <td className="px-3 py-2 text-right text-emerald-300">{formatNumber(row.resolvedCases)}</td>
                    <td className="px-3 py-2 text-right text-emerald-300">{formatCurrency(row.resolutionAmount)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-[#00F2FE]">{formatPercent(row.productivity)}</td>
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

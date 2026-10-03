"use client";

import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatNumber } from "@/lib/format";
import type { DialerAccountabilityGaps } from "@/lib/services/dialer-metrics";

const ITEMS: { key: keyof DialerAccountabilityGaps; label: string; hint: string }[] = [
  { key: "unworkedCases", label: "Allocated, never called", hint: "Cases with no dialer attempt" },
  { key: "calledNotConnected", label: "Called, not connected", hint: "Attempts with zero connect" },
  { key: "connectedNoRpc", label: "Connected, no RPC", hint: "Talk time without right party" },
  { key: "rpcNoPtp", label: "RPC, no PTP", hint: "Right party, no promise" },
  { key: "ptpNoResolution", label: "PTP, not resolved", hint: "Promise without payment" },
  { key: "resolvedWithoutCall", label: "Resolved without a call", hint: "Payment with no dialer work" },
];

export function DialerAccountability({
  gaps,
  onSelect,
}: {
  gaps: DialerAccountabilityGaps;
  onSelect?: (key: keyof DialerAccountabilityGaps) => void;
}) {
  return (
    <Card variant="glass">
      <CardHeader variant="glass">
        <h2 className="text-base font-semibold text-white">Calling vs resolution accountability</h2>
        <p className="mt-0.5 text-sm text-slate-400">
          Where allocated cases leak between attempts, connects, RPC, PTP, and actual recovery.
        </p>
      </CardHeader>
      <CardBody>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelect?.(item.key)}
              className="dash-clay rounded-2xl px-4 py-3 text-left transition hover:bg-white/5"
            >
              <p className="text-[11px] uppercase tracking-wider text-slate-400">{item.label}</p>
              <p className="mt-1 text-2xl font-bold text-white">{formatNumber(gaps[item.key])}</p>
              <p className="mt-1 text-xs text-slate-500">{item.hint}</p>
            </button>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

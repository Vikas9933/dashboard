"use client";

import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatNumber, formatPercent } from "@/lib/format";
import { ChevronDown } from "lucide-react";
import type { DialerFunnelStage } from "@/lib/services/dialer-metrics";

const COLORS = ["#00F2FE", "#38BDF8", "#A855F7", "#C084FC", "#F59E0B", "#34D399"];

export function DialerFunnel({ data }: { data: DialerFunnelStage[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <Card variant="glass">
      <CardHeader variant="glass">
        <h2 className="text-base font-semibold text-white">Calling → Resolution funnel</h2>
        <p className="mt-0.5 text-sm text-slate-400">
          Unique cases at each stage: Allocated → Attempted → Connected → RPC → PTP → Payment / Resolution
        </p>
      </CardHeader>
      <CardBody>
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-1">
          {data.map((stage, i) => {
            const widthPercent = 32 + (stage.count / maxCount) * 68;
            return (
              <div key={stage.stage} className="flex w-full flex-col items-center">
                <div
                  className="dash-clay flex w-full items-center justify-between rounded-2xl px-5 py-3"
                  style={{
                    width: `${widthPercent}%`,
                    background: `linear-gradient(135deg, ${COLORS[i % COLORS.length]}26, transparent)`,
                    borderColor: `${COLORS[i % COLORS.length]}40`,
                  }}
                >
                  <span className="text-sm font-semibold text-white">{stage.stage}</span>
                  <div className="text-right">
                    <span className="text-lg font-bold text-white">{formatNumber(stage.count)}</span>
                    <span className="ml-2 text-xs text-slate-400">{formatPercent(stage.conversionFromStart)}</span>
                  </div>
                </div>
                {i < data.length - 1 && (
                  <div className="flex flex-col items-center py-1">
                    <ChevronDown className="h-4 w-4 text-slate-500" />
                    <span className="text-[11px] text-slate-500">
                      {formatPercent(data[i + 1].conversionFromPrevious)} conversion
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}

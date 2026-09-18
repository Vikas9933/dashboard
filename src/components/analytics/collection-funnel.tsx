"use client";

import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatNumber, formatPercent } from "@/lib/format";
import { ChevronDown } from "lucide-react";
import type { FunnelStage } from "@/lib/services";

const COLORS = ["#00F2FE", "#22D3EE", "#38BDF8", "#A855F7", "#C084FC", "#34D399"];

export function CollectionFunnel({ data }: { data: FunnelStage[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <Card variant="glass">
      <CardHeader variant="glass">
        <h2 className="text-base font-semibold text-white">Collection Funnel</h2>
        <p className="mt-0.5 text-sm text-slate-400">Allocated → Contacted → Connected → PTP → Payment → Closed</p>
      </CardHeader>
      <CardBody>
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-1">
          {data.map((stage, i) => {
            const widthPercent = 30 + (stage.count / maxCount) * 70;
            return (
              <div key={stage.stage} className="flex w-full flex-col items-center">
                <div
                  className="dash-clay flex w-full items-center justify-between rounded-2xl px-5 py-3 transition-all duration-500"
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

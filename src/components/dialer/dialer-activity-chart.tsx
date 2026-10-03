"use client";

import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { GRID, TEAL, PURPLE, EMERALD, TICK, tooltipStyle } from "@/components/analytics/chart-theme";
import { formatDuration, formatNumber } from "@/lib/format";
import type { DialerDailyPoint } from "@/lib/services/dialer-metrics";

export function DialerActivityChart({ data }: { data: DialerDailyPoint[] }) {
  return (
    <Card variant="glass">
      <CardHeader variant="glass">
        <h2 className="text-base font-semibold text-white">Calling activity by date</h2>
        <p className="mt-0.5 text-sm text-slate-400">
          Attempts, connects, RPC, unique cases worked, and resolution amount by day.
        </p>
      </CardHeader>
      <CardBody>
        {data.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">No calls in this date range.</p>
        ) : (
          <div className="dash-chart-3d h-80 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: TICK, fontSize: 11 }} />
                <YAxis tick={{ fill: TICK, fontSize: 11 }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value, name) => {
                    const n = Number(value ?? 0);
                    if (name === "durationSeconds") return [formatDuration(n), "Talk time"];
                    if (name === "resolvedAmount") return [formatNumber(n), "Resolution amount"];
                    return [formatNumber(n), String(name)];
                  }}
                />
                <Legend />
                <Area type="monotone" dataKey="attempted" name="Attempted" stroke={PURPLE} fill={`${PURPLE}33`} />
                <Area type="monotone" dataKey="connected" name="Connected" stroke={TEAL} fill={`${TEAL}33`} />
                <Area type="monotone" dataKey="rpc" name="RPC" stroke={EMERALD} fill={`${EMERALD}33`} />
                <Area type="monotone" dataKey="uniqueCases" name="Cases worked" stroke="#F59E0B" fill="#F59E0B33" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

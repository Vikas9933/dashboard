"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatBucket, formatCurrency } from "@/lib/format";
import type { BucketPerformance } from "@/lib/types";

interface BucketChartProps {
  data: BucketPerformance[];
}

const TEAL = "#00F2FE";
const PURPLE = "#A855F7";
const SEGMENT_COLORS = ["#00F2FE", "#22D3EE", "#A855F7", "#C084FC", "#F59E0B", "#EF4444"];

const tooltipStyle = {
  borderRadius: "12px",
  border: "1px solid rgba(0, 242, 254, 0.2)",
  background: "rgba(11, 17, 32, 0.95)",
  color: "#f8fafc",
};

export function BucketChart({ data }: BucketChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    label: formatBucket(d.bucket),
    riskValue: d.allocated - d.collected,
  }));

  const pieData = chartData.map((d) => ({
    name: d.label,
    value: d.allocated,
    collected: d.collected,
  }));

  return (
    <Card variant="glass" className="h-full" id="buckets">
      <CardHeader variant="glass">
        <h2 className="text-base font-semibold text-white">Risk Segmentation</h2>
        <p className="mt-0.5 text-sm text-slate-400">Delinquency buckets & volumetric analysis</p>
      </CardHeader>
      <CardBody>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="dash-chart-3d flex h-64 items-center justify-center">
            {pieData.length === 0 ? (
              <p className="text-sm text-slate-500">No bucket data</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    {SEGMENT_COLORS.map((color, i) => (
                      <linearGradient key={i} id={`pieGrad${i}`} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={1} />
                        <stop offset="100%" stopColor={color} stopOpacity={0.5} />
                      </linearGradient>
                    ))}
                  </defs>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="rgba(11, 17, 32, 0.8)"
                    strokeWidth={2}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={`url(#pieGrad${i % SEGMENT_COLORS.length})`} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => [formatCurrency(Number(v)), "Allocated"]}
                    contentStyle={tooltipStyle}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="dash-chart-3d h-64">
            {chartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                No bucket data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value, name) => [
                      formatCurrency(Number(value)),
                      name === "collected" ? "Collected" : "Allocated",
                    ]}
                    contentStyle={tooltipStyle}
                  />
                  <Bar dataKey="allocated" fill="rgba(148,163,184,0.25)" radius={[4, 4, 0, 0]} name="allocated" />
                  <Bar dataKey="collected" fill={TEAL} radius={[4, 4, 0, 0]} name="collected" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          {pieData.map((d, i) => (
            <div key={d.name} className="flex items-center gap-2 text-xs text-slate-400">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }}
              />
              {d.name}
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

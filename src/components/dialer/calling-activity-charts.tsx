"use client";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type {
  DateCallingPoint,
  HourlyDistributionPoint,
  DispositionBreakdown,
} from "@/lib/services/dialer-service";
import { Activity, Clock, PieChart } from "lucide-react";

interface CallingActivityChartsProps {
  dailyCallingActivity: DateCallingPoint[];
  hourlyDistribution: HourlyDistributionPoint[];
  dispositionBreakdown: DispositionBreakdown[];
}

export function CallingActivityCharts({
  dailyCallingActivity,
  hourlyDistribution,
  dispositionBreakdown,
}: CallingActivityChartsProps) {
  const chartTooltipStyle = {
    backgroundColor: "#0B1120",
    border: "1px solid rgba(0, 242, 254, 0.2)",
    borderRadius: "12px",
    color: "#fff",
    fontSize: "12px",
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
  };

  return (
    <div className="space-y-6">
      {/* Daily Calling Timeline */}
      <div className="dash-clay rounded-2xl p-4 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00F2FE]/10 text-[#00F2FE]">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Calling Activity &amp; Resolution Timeline</h3>
              <p className="text-xs text-slate-400">
                Daily volume of calls attempted, connects, RPC conversations, and resulting case resolutions.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Attempts
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" /> Connected
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#00F2FE]" /> RPC
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> Resolved
            </span>
          </div>
        </div>

        <div className="mt-5 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyCallingActivity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorAttempts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorConnected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22D3EE" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22D3EE" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorRpc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00F2FE" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00F2FE" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="date"
                stroke="#64748B"
                fontSize={11}
                tickFormatter={(val) => {
                  try {
                    const parts = val.split("-");
                    return `${parts[2]}/${parts[1]}`;
                  } catch {
                    return val;
                  }
                }}
              />
              <YAxis stroke="#64748B" fontSize={11} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Area
                type="monotone"
                dataKey="attempted"
                name="Attempts"
                stroke="#3B82F6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorAttempts)"
              />
              <Area
                type="monotone"
                dataKey="connected"
                name="Connected"
                stroke="#22D3EE"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorConnected)"
              />
              <Area
                type="monotone"
                dataKey="rpc"
                name="RPC Contacts"
                stroke="#00F2FE"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRpc)"
              />
              <Area
                type="monotone"
                dataKey="resolved"
                name="Cases Resolved"
                stroke="#10B981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorResolved)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two Column Grid: Hourly Peak Calling & Disposition Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Distribution */}
        <div className="dash-clay rounded-2xl p-4 sm:p-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Hourly Calling Distribution</h3>
                <p className="text-xs text-slate-400">Peak connect and RPC intervals across the day</p>
              </div>
            </div>
          </div>

          <div className="mt-5 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="hour" stroke="#64748B" fontSize={11} />
                <YAxis stroke="#64748B" fontSize={11} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Legend
                  wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
                  iconType="circle"
                />
                <Bar dataKey="attempted" name="Attempts" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="connected" name="Connected" fill="#06B6D4" radius={[4, 4, 0, 0]} />
                <Bar dataKey="rpc" name="RPC" fill="#00F2FE" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Disposition Breakdown */}
        <div className="dash-clay rounded-2xl p-4 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                  <PieChart className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Call Dispositions Breakdown</h3>
                  <p className="text-xs text-slate-400">Outcome classifications of all dialer attempts</p>
                </div>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {dispositionBreakdown.reduce((s, d) => s + d.count, 0)} calls
              </span>
            </div>

            <div className="mt-4 space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {dispositionBreakdown.map((item) => (
                <div key={item.disposition} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-slate-300 font-medium">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          item.isPositive ? "bg-emerald-400" : "bg-slate-500"
                        }`}
                      />
                      {item.label}
                    </span>
                    <span className="font-mono text-slate-400">
                      <strong className="text-white">{item.count.toLocaleString("en-IN")}</strong> ({item.percentage}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-black/40 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        item.disposition === "RPC_PTP"
                          ? "bg-emerald-500"
                          : item.isPositive
                          ? "bg-cyan-400"
                          : "bg-slate-600"
                      }`}
                      style={{ width: `${Math.min(100, Math.max(2, item.percentage))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400" /> Positive Outcomes
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-slate-500" /> Telecom / Unanswered
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

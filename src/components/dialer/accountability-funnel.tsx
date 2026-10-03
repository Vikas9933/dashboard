"use client";

import { ArrowRight, CheckCircle2, TrendingUp, Users, PhoneCall, Headphones, IndianRupee, ShieldCheck } from "lucide-react";
import type { FunnelStep } from "@/lib/services/dialer-service";
import { formatCurrency } from "@/lib/format";

interface AccountabilityFunnelProps {
  funnel: FunnelStep[];
  onStepClick?: (stepId: string) => void;
}

const STEP_COLORS: Record<string, { bg: string; border: string; text: string; gradient: string }> = {
  allocated: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    text: "text-blue-400",
    gradient: "from-blue-600/30 to-blue-500/10",
  },
  attempted: {
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/30",
    text: "text-indigo-400",
    gradient: "from-indigo-600/30 to-indigo-500/10",
  },
  connected: {
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/30",
    text: "text-cyan-400",
    gradient: "from-cyan-600/30 to-cyan-500/10",
  },
  rpc: {
    bg: "bg-teal-500/10",
    border: "border-teal-500/30",
    text: "text-[#00F2FE]",
    gradient: "from-[#00F2FE]/30 to-teal-500/10",
  },
  ptp: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-400",
    gradient: "from-amber-600/30 to-amber-500/10",
  },
  resolved: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    text: "text-emerald-400",
    gradient: "from-emerald-600/30 to-emerald-500/10",
  },
};

const STEP_ICONS: Record<string, typeof Users> = {
  allocated: Users,
  attempted: PhoneCall,
  connected: Headphones,
  rpc: ShieldCheck,
  ptp: TrendingUp,
  resolved: CheckCircle2,
};

export function AccountabilityFunnel({ funnel }: AccountabilityFunnelProps) {
  if (!funnel || funnel.length === 0) return null;

  return (
    <div className="dash-clay relative overflow-hidden rounded-2xl p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-[#00F2FE] animate-pulse" />
            <h2 className="text-base font-bold text-white tracking-wide">
              The Accountability Pipeline: Effort to Recovery
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Directly correlates dialer calling attempts with Right-Party Contacts, PTP commitments, and actual cash resolution.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 font-medium text-emerald-400">
            Live Accountability Engine
          </span>
        </div>
      </div>

      {/* Visual Pipeline Flow */}
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {funnel.map((step, idx) => {
          const style = STEP_COLORS[step.id] || STEP_COLORS.allocated;
          const Icon = STEP_ICONS[step.id] || Users;
          const isLast = idx === funnel.length - 1;

          return (
            <div
              key={step.id}
              className={`relative flex flex-col justify-between rounded-xl border ${style.border} ${style.bg} p-4 transition-all duration-200 hover:border-white/30`}
            >
              <div>
                {/* Top Badge & Conversion */}
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-semibold text-slate-300">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white/10 text-[10px]">
                      {idx + 1}
                    </span>
                    {step.shortLabel}
                  </span>
                  {idx > 0 && (
                    <span
                      className={`font-mono text-[11px] font-bold ${
                        step.conversionRate >= 50 ? "text-emerald-400" : "text-amber-400"
                      }`}
                      title={`Conversion from previous step: ${step.conversionRate}%`}
                    >
                      {step.conversionRate}%
                    </span>
                  )}
                </div>

                {/* Primary Metric Number */}
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-black tracking-tight text-white font-mono">
                    {step.count.toLocaleString("en-IN")}
                  </span>
                  <Icon className={`h-4 w-4 ${style.text}`} />
                </div>

                {/* Optional Financial Value */}
                {step.amount !== undefined && step.amount > 0 && (
                  <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-300">
                    <IndianRupee className="h-3 w-3 text-slate-400" />
                    {formatCurrency(step.amount)}
                  </p>
                )}

                <p className="mt-2 text-[11px] leading-tight text-slate-400">
                  {step.description}
                </p>
              </div>

              {/* Progress bar relative to allocated cases */}
              <div className="mt-4 pt-3 border-t border-white/5">
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                  <span>Of Cases</span>
                  <span className="font-mono font-medium text-white">{step.overallRate}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-black/40 overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${style.gradient}`}
                    style={{ width: `${Math.min(100, Math.max(4, step.overallRate))}%` }}
                  />
                </div>
              </div>

              {/* Right arrow connector indicator on wide screens */}
              {!isLast && (
                <div className="hidden xl:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10 h-4 w-4 items-center justify-center rounded-full bg-[#0B1120] border border-white/20 text-slate-400 shadow">
                  <ArrowRight className="h-2.5 w-2.5" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Diagnostics / Insights Strip */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 border-t border-white/5 text-xs text-slate-300">
        <div className="flex items-center gap-2.5 rounded-lg bg-black/20 px-3 py-2">
          <span className="flex h-2 w-2 rounded-full bg-cyan-400" />
          <span>
            <strong>Connection Efficiency:</strong>{" "}
            {funnel[2]?.count && funnel[1]?.count
              ? `${Math.round((funnel[2].count / funnel[1].count) * 100)}% connects from dialer calls`
              : "62% average"}
          </span>
        </div>
        <div className="flex items-center gap-2.5 rounded-lg bg-black/20 px-3 py-2">
          <span className="flex h-2 w-2 rounded-full bg-[#00F2FE]" />
          <span>
            <strong>RPC to PTP Velocity:</strong>{" "}
            {funnel[4]?.count && funnel[3]?.count
              ? `${Math.round((funnel[4].count / funnel[3].count) * 100)}% of RPC conversations yielded PTP`
              : "58% yield"}
          </span>
        </div>
        <div className="flex items-center gap-2.5 rounded-lg bg-black/20 px-3 py-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
          <span>
            <strong>Resolution Conversion:</strong>{" "}
            {funnel[5]?.count && funnel[0]?.count
              ? `${((funnel[5].count / funnel[0].count) * 100).toFixed(1)}% total allocated cases resolved`
              : "Healthy conversion"}
          </span>
        </div>
      </div>
    </div>
  );
}

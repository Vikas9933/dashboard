"use client";

import {
  Banknote,
  CheckCircle2,
  Clock,
  TrendingUp,
  Percent,
  AlertCircle,
  Building2,
  UserCheck,
  Scale,
  ReceiptIndianRupee,
} from "lucide-react";
import type { BillingKpis } from "@/lib/services/billing-service";

interface BillingKpiGridProps {
  kpis: BillingKpis;
}

export function BillingKpiGrid({ kpis }: BillingKpiGridProps) {
  function formatInr(val: number) {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
    return `₹${val.toLocaleString("en-IN")}`;
  }

  const cards = [
    {
      label: "Total Case Resolutions",
      value: kpis.totalResolutions.toLocaleString("en-IN"),
      sub: `${formatInr(kpis.totalResolutionAmount)} recovered`,
      icon: Scale,
      color: "from-blue-500/10 to-indigo-500/5",
      border: "border-blue-500/20",
      iconColor: "text-blue-400",
      badge: "Actual Cash Recoveries",
    },
    {
      label: "Total Generated Billing",
      value: formatInr(kpis.totalGeneratedBilling),
      sub: `${kpis.effectiveBillingYieldPct}% effective yield on collection`,
      icon: Banknote,
      color: "from-emerald-500/10 to-teal-500/5",
      border: "border-emerald-500/20",
      iconColor: "text-emerald-400",
      badge: "Commercial Revenue",
      highlight: true,
    },
    {
      label: "Approved Billing",
      value: formatInr(kpis.approvedBillingAmount),
      sub: `${kpis.totalGeneratedBilling > 0 ? Math.round((kpis.approvedBillingAmount / kpis.totalGeneratedBilling) * 100) : 0}% of generated total`,
      icon: CheckCircle2,
      color: "from-cyan-500/10 to-blue-500/5",
      border: "border-cyan-500/20",
      iconColor: "text-cyan-400",
      badge: "Bank/Client Verified",
    },
    {
      label: "Pending Approval",
      value: formatInr(kpis.pendingApprovalAmount),
      sub: "Awaiting bank verification & sign-off",
      icon: Clock,
      color: "from-amber-500/10 to-yellow-500/5",
      border: "border-amber-500/20",
      iconColor: "text-amber-400",
      badge: "Review Queue",
    },
    {
      label: "Paid Disbursements",
      value: formatInr(kpis.paidPayoutAmount),
      sub: `${formatInr(kpis.unpaidPayoutAmount)} pending disbursement`,
      icon: ReceiptIndianRupee,
      color: "from-violet-500/10 to-purple-500/5",
      border: "border-violet-500/20",
      iconColor: "text-violet-400",
      badge: "Bank Payouts Settled",
    },
    {
      label: "Avg Billing / Case",
      value: `₹${kpis.avgBillingPerResolution.toLocaleString("en-IN")}`,
      sub: "Commercial fee per resolved account",
      icon: TrendingUp,
      color: "from-sky-500/10 to-slate-500/5",
      border: "border-sky-500/20",
      iconColor: "text-sky-400",
      badge: "Unit Economics",
    },
    {
      label: "Top Billing Agency",
      value: kpis.highestBillingAgency.name,
      sub: `${formatInr(kpis.highestBillingAgency.amount)} generated`,
      icon: Building2,
      color: "from-rose-500/10 to-pink-500/5",
      border: "border-rose-500/20",
      iconColor: "text-rose-400",
      badge: "Leading Partner",
    },
    {
      label: "Top Earning Agent",
      value: kpis.topEarningAgent.name,
      sub: `${formatInr(kpis.topEarningAgent.amount)} (${kpis.topEarningAgent.resolutions} cases)`,
      icon: UserCheck,
      color: "from-amber-500/10 to-orange-500/5",
      border: "border-amber-500/20",
      iconColor: "text-amber-400",
      badge: "Star Performer",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={`group relative flex flex-col justify-between rounded-xl border ${card.border} bg-gradient-to-br ${card.color} bg-[#0e1726]/80 p-4 backdrop-blur-md transition-all duration-200 hover:border-white/20 hover:shadow-lg`}
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-400">{card.label}</span>
                <span className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-slate-300">
                  {card.badge}
                </span>
              </div>
              <div className="mt-2.5 flex items-baseline gap-2">
                <p className="text-xl font-bold tracking-tight text-white lg:text-2xl">{card.value}</p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2">
              <p className="text-[11px] text-slate-400 truncate">{card.sub}</p>
              <div className={`rounded-lg p-1.5 bg-white/5 ${card.iconColor}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

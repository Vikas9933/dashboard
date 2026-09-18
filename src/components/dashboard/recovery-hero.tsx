"use client";

import { TrendingUp } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { AnimatedCounter } from "@/components/dashboard/animated-counter";
import { formatPercent } from "@/lib/format";

interface RecoveryHeroProps {
  collectedAmount: number;
  collectedFormatted: string;
  collectionPercent: number;
  totalAccounts: number;
}

export function RecoveryHero({
  collectedAmount,
  collectedFormatted,
  collectionPercent,
  totalAccounts,
}: RecoveryHeroProps) {
  return (
    <Card variant="hero" className="relative h-full overflow-hidden">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#00F2FE]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-8 left-1/3 h-32 w-32 rounded-full bg-violet-500/15 blur-3xl" />
      <CardBody className="relative">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 shrink-0 text-[#00F2FE]" />
              <p className="dash-section-title">Total Recovered Amount</p>
            </div>
            <p className="mt-3 text-sm text-slate-400">Real-time collection recovery across portfolio</p>
            <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-2">
              <span className="shrink-0 text-xl font-medium text-[#00F2FE] sm:text-2xl">₹</span>
              <AnimatedCounter
                value={collectedAmount}
                className="dash-counter min-w-0 break-all text-2xl font-bold sm:text-3xl lg:text-4xl"
              />
            </div>
            <p className="mt-2 text-sm text-slate-500">{collectedFormatted} cumulative</p>
          </div>
          <div className="grid w-full shrink-0 grid-cols-2 gap-3 sm:w-auto sm:min-w-[220px]">
            <div className="dash-clay rounded-xl px-3 py-3 text-center sm:px-4">
              <p className="text-xl font-bold text-[#00F2FE] sm:text-2xl">{formatPercent(collectionPercent)}</p>
              <p className="mt-1 text-xs text-slate-500">Recovery Rate</p>
            </div>
            <div className="dash-clay rounded-xl px-3 py-3 text-center sm:px-4">
              <p className="text-xl font-bold text-violet-400 sm:text-2xl">
                {totalAccounts.toLocaleString("en-IN")}
              </p>
              <p className="mt-1 text-xs text-slate-500">Accounts</p>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

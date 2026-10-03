"use client";

import {
  Building2,
  Landmark,
  Package,
  PhoneCall,
  PhoneMissed,
  Timer,
  UserRound,
  Users,
} from "lucide-react";
import { StatTile } from "@/components/analytics/stat-tile";
import { formatCurrency, formatDuration, formatNumber, formatPercent } from "@/lib/format";
import type { DialerMetrics } from "@/lib/services/dialer-metrics";

export function DialerKpiGrid({
  summary,
  onOpen,
}: {
  summary: DialerMetrics;
  onOpen?: (view: "cases" | "funnel" | "activity" | "agent") => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
      <StatTile label="Allocated cases" value={formatNumber(summary.allocatedCases)} hint={formatCurrency(summary.allocatedAmount)} accent="teal" icon={<Users className="h-4 w-4" />} onClick={() => onOpen?.("cases")} />
      <StatTile label="Calls attempted" value={formatNumber(summary.callsAttempted)} hint={`${formatNumber(summary.uniqueCasesCalled)} cases worked`} accent="purple" icon={<PhoneCall className="h-4 w-4" />} onClick={() => onOpen?.("activity")} />
      <StatTile label="Connected" value={formatNumber(summary.connectedCalls)} hint={`${formatPercent(summary.connectRate)} connect rate`} accent="emerald" onClick={() => onOpen?.("funnel")} />
      <StatTile label="Not connected" value={formatNumber(summary.notConnectedCalls)} accent="rose" icon={<PhoneMissed className="h-4 w-4" />} onClick={() => onOpen?.("funnel")} />
      <StatTile label="RPC" value={formatNumber(summary.rpcCount)} hint={`${formatPercent(summary.rpcRate)} of connected`} accent="teal" onClick={() => onOpen?.("funnel")} />
      <StatTile label="PTP generated" value={formatNumber(summary.ptpGenerated)} hint={formatCurrency(summary.ptpAmount)} accent="amber" onClick={() => onOpen?.("funnel")} />
      <StatTile label="PTP conversion" value={formatPercent(summary.ptpConversion)} hint="PTP / RPC" accent="purple" onClick={() => onOpen?.("funnel")} />
      <StatTile label="Broken PTP" value={formatNumber(summary.brokenPtp)} accent="rose" onClick={() => onOpen?.("cases")} />
      <StatTile label="Call duration" value={formatDuration(summary.callDurationSeconds)} accent="slate" icon={<Timer className="h-4 w-4" />} onClick={() => onOpen?.("activity")} />
      <StatTile label="Follow-up cases" value={formatNumber(summary.followUpCases)} accent="amber" onClick={() => onOpen?.("cases")} />
      <StatTile label="Resolved cases" value={formatNumber(summary.resolvedCases)} hint={`${formatPercent(summary.resolutionRate)} of allocated`} accent="emerald" icon={<UserRound className="h-4 w-4" />} onClick={() => onOpen?.("cases")} />
      <StatTile label="Resolution amount" value={formatCurrency(summary.resolutionAmount)} accent="emerald" icon={<Landmark className="h-4 w-4" />} onClick={() => onOpen?.("cases")} />
      <StatTile label="Agent productivity" value={formatPercent(summary.productivity)} hint="Connect + RPC + PTP + resolve + coverage" accent="teal" icon={<Building2 className="h-4 w-4" />} onClick={() => onOpen?.("agent")} />
      <StatTile label="Attempt coverage" value={formatPercent(summary.attemptCoverage)} hint="Cases called / allocated" accent="purple" icon={<Package className="h-4 w-4" />} onClick={() => onOpen?.("cases")} />
    </div>
  );
}

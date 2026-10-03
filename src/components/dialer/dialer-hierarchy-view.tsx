"use client";

import { useState, useMemo } from "react";
import {
  Building2,
  Briefcase,
  Layers,
  Users,
  Headphones,
  ChevronRight,
  Search,
  ArrowUpDown,
} from "lucide-react";
import type { HierarchyAggregate } from "@/lib/services/dialer-service";
import { formatCurrency } from "@/lib/format";

interface DialerHierarchyViewProps {
  currentLevel: "client" | "bank" | "product" | "agency" | "tl" | "agent";
  onLevelChange: (level: "client" | "bank" | "product" | "agency" | "tl" | "agent") => void;
  data: {
    client: HierarchyAggregate[];
    bank: HierarchyAggregate[];
    product: HierarchyAggregate[];
    agency: HierarchyAggregate[];
    tl: HierarchyAggregate[];
    agent: HierarchyAggregate[];
  };
  onDrillDown: (type: "bank" | "product" | "agency" | "tl" | "agent", name: string) => void;
}

export function DialerHierarchyView({
  currentLevel,
  onLevelChange,
  data,
  onDrillDown,
}: DialerHierarchyViewProps) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<keyof HierarchyAggregate>("resolutionAmount");
  const [sortAsc, setSortAsc] = useState(false);

  const levelTabs: {
    id: "client" | "bank" | "product" | "agency" | "tl" | "agent";
    label: string;
    icon: typeof Building2;
    count: number;
  }[] = [
    { id: "client", label: "Client Level", icon: Building2, count: data.client.length },
    { id: "bank", label: "Bank Level", icon: Building2, count: data.bank.length },
    { id: "product", label: "Product Level", icon: Layers, count: data.product.length },
    { id: "agency", label: "Agency Level", icon: Briefcase, count: data.agency.length },
    { id: "tl", label: "TL Level", icon: Users, count: data.tl.length },
    { id: "agent", label: "Agent Level", icon: Headphones, count: data.agent.length },
  ];

  const filteredAndSortedList = useMemo(() => {
    const currentList = data[currentLevel] || [];
    let list = [...currentList];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((item) => item.name.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      if (typeof valA === "string" && typeof valB === "string") {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? Number(valA || 0) - Number(valB || 0) : Number(valB || 0) - Number(valA || 0);
    });

    return list;
  }, [data, currentLevel, search, sortField, sortAsc]);

  function handleSort(field: keyof HierarchyAggregate) {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  }

  function formatDuration(seconds: number): string {
    if (!seconds) return "0s";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  }

  function getNextLevel(
    lvl: "client" | "bank" | "product" | "agency" | "tl" | "agent"
  ): "bank" | "product" | "agency" | "tl" | "agent" | null {
    switch (lvl) {
      case "client":
      case "bank":
        return "product";
      case "product":
        return "agency";
      case "agency":
        return "tl";
      case "tl":
        return "agent";
      default:
        return null;
    }
  }

  return (
    <div className="dash-clay rounded-2xl p-4 sm:p-6">
      {/* Level Switcher Navigation */}
      <div className="flex flex-col gap-4 border-b border-white/5 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white tracking-wide">
              Calling &amp; Performance Hierarchy
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Drillable across Client/Bank → Product → Agency → TL → Agent to audit calling accountability.
            </p>
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder={`Search ${currentLevel}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-[#00F2FE]/40 focus:outline-none"
            />
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {levelTabs.map((tab) => {
            const Icon = tab.icon;
            const active = currentLevel === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  onLevelChange(tab.id);
                  setSearch("");
                }}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                  active
                    ? "bg-[#00F2FE]/15 border border-[#00F2FE]/40 text-[#00F2FE] shadow-lg shadow-[#00F2FE]/10"
                    : "bg-white/5 border border-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                    active ? "bg-[#00F2FE]/20 text-[#00F2FE]" : "bg-white/10 text-slate-400"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* High-Density Performance Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-[11px] font-semibold text-slate-400">
              <th className="py-3 px-3">#</th>
              <th
                className="py-3 px-3 cursor-pointer hover:text-white"
                onClick={() => handleSort("name")}
              >
                <div className="flex items-center gap-1">
                  <span>Name</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                className="py-3 px-3 text-right cursor-pointer hover:text-white"
                onClick={() => handleSort("allocatedCases")}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Allocated</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                className="py-3 px-3 text-right cursor-pointer hover:text-white"
                onClick={() => handleSort("callsAttempted")}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Calls Attempted</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                className="py-3 px-3 text-right cursor-pointer hover:text-white"
                onClick={() => handleSort("connectRate")}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Connect Rate</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                className="py-3 px-3 text-right cursor-pointer hover:text-white"
                onClick={() => handleSort("rpcRate")}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>RPC %</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                className="py-3 px-3 text-right cursor-pointer hover:text-white"
                onClick={() => handleSort("ptpCount")}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>PTP (Count / ₹)</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                className="py-3 px-3 text-right cursor-pointer hover:text-white"
                onClick={() => handleSort("ptpConversionRate")}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>PTP Conv %</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                className="py-3 px-3 text-right cursor-pointer hover:text-white"
                onClick={() => handleSort("averageCallDurationSeconds")}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Avg Duration</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                className="py-3 px-3 text-right cursor-pointer hover:text-white"
                onClick={() => handleSort("resolvedCases")}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Resolved</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                className="py-3 px-3 text-right cursor-pointer hover:text-white"
                onClick={() => handleSort("resolutionAmount")}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Resolution Amt</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                className="py-3 px-3 text-right cursor-pointer hover:text-white"
                onClick={() => handleSort("productivityScore")}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Score</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-3 px-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredAndSortedList.map((item, index) => {
              const nextLevel = getNextLevel(currentLevel);
              return (
                <tr
                  key={item.id}
                  className="hover:bg-white/[0.03] transition-colors group"
                >
                  <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                    {item.rank || index + 1}
                  </td>
                  <td className="py-3 px-3 font-medium text-white">
                    <div className="flex flex-col">
                      <span className="font-semibold text-white group-hover:text-[#00F2FE] transition-colors">
                        {item.name}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {formatCurrency(item.outstandingAmount)} outstanding
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-300">
                    {item.allocatedCases.toLocaleString("en-IN")}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-300">
                    <span className="font-semibold text-white">{item.callsAttempted.toLocaleString("en-IN")}</span>
                    <span className="block text-[10px] text-slate-500">
                      {item.allocatedCases > 0 ? (item.callsAttempted / item.allocatedCases).toFixed(1) : 0}/case
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    <span
                      className={`font-semibold ${
                        item.connectRate >= 60 ? "text-cyan-400" : "text-amber-400"
                      }`}
                    >
                      {item.connectRate}%
                    </span>
                    <span className="block text-[10px] text-slate-500">
                      {item.connectedCalls} / {item.notConnectedCalls}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    <span
                      className={`font-semibold ${
                        item.rpcRate >= 65 ? "text-[#00F2FE]" : "text-slate-300"
                      }`}
                    >
                      {item.rpcRate}%
                    </span>
                    <span className="block text-[10px] text-slate-500">{item.rpcCount} RPCs</span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-300">
                    <span className="font-semibold text-amber-400">{item.ptpCount}</span>
                    <span className="block text-[10px] text-slate-400">
                      {formatCurrency(item.ptpAmount)}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    <span
                      className={`font-semibold ${
                        item.ptpConversionRate >= 50 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {item.ptpConversionRate}%
                    </span>
                    <span className="block text-[10px] text-rose-400/80">
                      {item.brokenPtpCount} broken
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-400 text-[11px]">
                    {formatDuration(item.averageCallDurationSeconds)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    <span className="font-bold text-emerald-400">{item.resolvedCases}</span>
                    <span className="block text-[10px] text-slate-500">
                      {item.resolutionRate}% rate
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                    {formatCurrency(item.resolutionAmount)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    <span
                      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                        item.productivityScore >= 75
                          ? "bg-emerald-500/20 text-emerald-300"
                          : item.productivityScore >= 50
                          ? "bg-amber-500/20 text-amber-300"
                          : "bg-rose-500/20 text-rose-300"
                      }`}
                    >
                      {item.productivityScore}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    {nextLevel ? (
                      <button
                        type="button"
                        onClick={() => onDrillDown(nextLevel, item.name)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#00F2FE]/30 bg-[#00F2FE]/10 px-2 py-1 text-[11px] font-medium text-[#00F2FE] hover:bg-[#00F2FE]/20 hover:border-[#00F2FE] transition"
                        title={`Drill down to ${nextLevel}`}
                      >
                        <span>Drill</span>
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onDrillDown("agent", item.name)}
                        className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-medium text-slate-300 hover:text-white hover:bg-white/10 transition"
                      >
                        <span>Cases</span>
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredAndSortedList.length === 0 && (
          <div className="py-12 text-center text-slate-500 text-xs">
            No {currentLevel} performance records match your current filter criteria.
          </div>
        )}
      </div>
    </div>
  );
}

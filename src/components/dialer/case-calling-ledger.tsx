"use client";

import { useState } from "react";
import {
  Search,
  PhoneCall,
  History,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";
import type { DialerCaseRecord } from "@/lib/services/dialer-service";
import { formatCurrency } from "@/lib/format";

interface CaseCallingLedgerProps {
  cases: DialerCaseRecord[];
  onViewCaseLogs: (caseRecord: DialerCaseRecord) => void;
  onQuickDial: (caseRecord: DialerCaseRecord) => void;
}

export function CaseCallingLedger({
  cases,
  onViewCaseLogs,
  onQuickDial,
}: CaseCallingLedgerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [dispositionFilter, setDispositionFilter] = useState("all");
  const [resolutionFilter, setResolutionFilter] = useState("all");

  const filteredCases = cases.filter((c) => {
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const match =
        c.loanNumber.toLowerCase().includes(q) ||
        c.customerName.toLowerCase().includes(q) ||
        c.phoneNumber.includes(q) ||
        c.agentName.toLowerCase().includes(q) ||
        c.clientBank.toLowerCase().includes(q);
      if (!match) return false;
    }

    if (dispositionFilter !== "all") {
      if (dispositionFilter === "ptp" && !c.ptpGenerated) return false;
      if (dispositionFilter === "rpc" && c.rpcCount === 0) return false;
      if (dispositionFilter === "uncontacted" && c.callsAttempted > 0) return false;
    }

    if (resolutionFilter !== "all") {
      if (resolutionFilter === "resolved" && !c.isResolved) return false;
      if (resolutionFilter === "pending" && c.isResolved) return false;
    }

    return true;
  });

  function getDispositionBadge(disp: string | null) {
    if (!disp) {
      return (
        <span className="rounded-md bg-slate-500/10 border border-slate-500/20 px-2 py-0.5 text-[10px] text-slate-400 font-medium">
          Not Contacted
        </span>
      );
    }
    if (disp === "RPC_PTP") {
      return (
        <span className="rounded-md bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] text-emerald-400 font-semibold">
          PTP Promised
        </span>
      );
    }
    if (disp.startsWith("RPC")) {
      return (
        <span className="rounded-md bg-[#00F2FE]/10 border border-[#00F2FE]/30 px-2 py-0.5 text-[10px] text-[#00F2FE] font-medium">
          {disp.replace("RPC_", "").replace(/_/g, " ")}
        </span>
      );
    }
    return (
      <span className="rounded-md bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 text-[10px] text-rose-400 font-medium">
        {disp.replace(/_/g, " ")}
      </span>
    );
  }

  function getResolutionBadge(c: DialerCaseRecord) {
    if (c.isResolved) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
          Resolved ({formatCurrency(c.resolutionAmount)})
        </span>
      );
    }
    if (c.ptpStatus === "broken") {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-[11px] font-semibold text-rose-400">
          <AlertCircle className="h-3 w-3" />
          Broken PTP
        </span>
      );
    }
    if (c.isFollowUp) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[11px] font-medium text-amber-300">
          <Clock className="h-3 w-3" />
          Follow-up ({c.followUpDate || "Scheduled"})
        </span>
      );
    }
    return (
      <span className="rounded-md bg-slate-500/10 px-2 py-0.5 text-[11px] text-slate-400 font-medium">
        In Progress
      </span>
    );
  }

  return (
    <div className="dash-clay rounded-2xl p-4 sm:p-6">
      {/* Header and Controls */}
      <div className="flex flex-col gap-4 border-b border-white/5 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide">
                Customer &amp; Case Calling Ledger
              </h2>
              <span className="rounded-full bg-[#00F2FE]/15 px-2 py-0.5 text-[10px] font-mono text-[#00F2FE]">
                {filteredCases.length} cases
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Audit the exact calling trail, contact attempts, PTP status, and cash settlement for every allocated loan.
            </p>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by loan #, borrower, phone, agent..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-[#00F2FE]/40 focus:outline-none"
            />
          </div>
        </div>

        {/* Sub-filters for Ledger */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium mr-1">Filter by:</span>
          <button
            type="button"
            onClick={() => setDispositionFilter("all")}
            className={`rounded-lg px-2.5 py-1 text-xs transition ${
              dispositionFilter === "all" ? "bg-white/20 text-white font-semibold" : "bg-white/5 text-slate-400 hover:text-white"
            }`}
          >
            All Calls
          </button>
          <button
            type="button"
            onClick={() => setDispositionFilter("ptp")}
            className={`rounded-lg px-2.5 py-1 text-xs transition ${
              dispositionFilter === "ptp" ? "bg-amber-500/20 text-amber-300 font-semibold" : "bg-white/5 text-slate-400 hover:text-white"
            }`}
          >
            Has PTP
          </button>
          <button
            type="button"
            onClick={() => setDispositionFilter("rpc")}
            className={`rounded-lg px-2.5 py-1 text-xs transition ${
              dispositionFilter === "rpc" ? "bg-cyan-500/20 text-cyan-300 font-semibold" : "bg-white/5 text-slate-400 hover:text-white"
            }`}
          >
            Connected RPC
          </button>
          <button
            type="button"
            onClick={() => setDispositionFilter("uncontacted")}
            className={`rounded-lg px-2.5 py-1 text-xs transition ${
              dispositionFilter === "uncontacted" ? "bg-rose-500/20 text-rose-300 font-semibold" : "bg-white/5 text-slate-400 hover:text-white"
            }`}
          >
            Zero Attempts
          </button>

          <span className="h-4 w-[1px] bg-white/10 mx-1" />

          <button
            type="button"
            onClick={() => setResolutionFilter("all")}
            className={`rounded-lg px-2.5 py-1 text-xs transition ${
              resolutionFilter === "all" ? "bg-white/20 text-white font-semibold" : "bg-white/5 text-slate-400 hover:text-white"
            }`}
          >
            All Status
          </button>
          <button
            type="button"
            onClick={() => setResolutionFilter("resolved")}
            className={`rounded-lg px-2.5 py-1 text-xs transition ${
              resolutionFilter === "resolved" ? "bg-emerald-500/20 text-emerald-300 font-semibold" : "bg-white/5 text-slate-400 hover:text-white"
            }`}
          >
            Resolved Cases
          </button>
          <button
            type="button"
            onClick={() => setResolutionFilter("pending")}
            className={`rounded-lg px-2.5 py-1 text-xs transition ${
              resolutionFilter === "pending" ? "bg-blue-500/20 text-blue-300 font-semibold" : "bg-white/5 text-slate-400 hover:text-white"
            }`}
          >
            Pending Resolution
          </button>
        </div>
      </div>

      {/* Cases Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-[11px] font-semibold text-slate-400">
              <th className="py-3 px-3">Borrower / Loan #</th>
              <th className="py-3 px-3">Bank &amp; Product</th>
              <th className="py-3 px-3">Agency &amp; TL</th>
              <th className="py-3 px-3">Assigned Agent</th>
              <th className="py-3 px-3 text-right">Outstanding</th>
              <th className="py-3 px-3 text-center">Calling Effort</th>
              <th className="py-3 px-3">Last Disposition</th>
              <th className="py-3 px-3">Resolution &amp; PTP</th>
              <th className="py-3 px-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredCases.slice(0, 100).map((c) => (
              <tr key={c.accountId} className="hover:bg-white/[0.03] transition-colors group">
                <td className="py-3 px-3">
                  <div className="flex flex-col">
                    <span className="font-semibold text-white group-hover:text-[#00F2FE] transition-colors">
                      {c.customerName}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">{c.loanNumber}</span>
                    <span className="text-[10px] text-slate-500">{c.phoneNumber}</span>
                  </div>
                </td>
                <td className="py-3 px-3">
                  <div className="flex flex-col">
                    <span className="text-slate-300 font-medium">{c.clientBank}</span>
                    <span className="text-[10px] text-slate-500">{c.productType}</span>
                    <span className="text-[10px] text-slate-500 font-mono">Bucket: {c.bucket}</span>
                  </div>
                </td>
                <td className="py-3 px-3">
                  <div className="flex flex-col">
                    <span className="text-slate-300">{c.agencyName}</span>
                    <span className="text-[10px] text-slate-500">TL: {c.teamLeaderName}</span>
                  </div>
                </td>
                <td className="py-3 px-3">
                  <span className="font-medium text-slate-200">{c.agentName}</span>
                </td>
                <td className="py-3 px-3 text-right font-mono font-medium text-white">
                  {formatCurrency(c.outstandingAmount)}
                </td>
                <td className="py-3 px-3 text-center">
                  <div className="flex flex-col items-center">
                    <span className="font-mono font-bold text-white">
                      {c.callsAttempted} attempts
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {c.callsConnected} connects • {c.rpcCount} RPC
                    </span>
                    {c.lastCallDate && (
                      <span className="text-[9px] text-slate-500">
                        Last: {c.lastCallDate} ({Math.round(c.lastCallDurationSeconds)}s)
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-3">
                  {getDispositionBadge(c.lastDisposition)}
                </td>
                <td className="py-3 px-3">
                  {getResolutionBadge(c)}
                </td>
                <td className="py-3 px-3 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onViewCaseLogs(c)}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-medium text-slate-300 hover:bg-[#00F2FE]/10 hover:border-[#00F2FE]/30 hover:text-[#00F2FE] transition"
                      title="View all chronological dialer attempts"
                    >
                      <History className="h-3 w-3" />
                      <span>Audit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onQuickDial(c)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#00F2FE]/30 bg-[#00F2FE]/10 px-2 py-1 text-[11px] font-medium text-[#00F2FE] hover:bg-[#00F2FE]/20 hover:border-[#00F2FE] transition"
                      title="Place automated or manual dialer call"
                    >
                      <PhoneCall className="h-3 w-3" />
                      <span>Dial</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredCases.length === 0 && (
          <div className="py-12 text-center text-slate-500 text-xs">
            No delinquent cases found matching your filters.
          </div>
        )}

        {filteredCases.length > 100 && (
          <div className="py-3 text-center text-xs text-slate-500 border-t border-white/5">
            Showing top 100 cases of {filteredCases.length} total. Refine search or filter for specific accounts.
          </div>
        )}
      </div>
    </div>
  );
}

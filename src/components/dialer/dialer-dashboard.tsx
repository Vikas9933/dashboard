"use client";

import { useState } from "react";
import {
  PhoneCall,
  Filter,
  ChevronRight,
  Activity,
  Layers3,
  FileSpreadsheet,
  CheckCircle2,
} from "lucide-react";
import type {
  DialerWorkspaceData,
  DialerCaseRecord,
  DialerDisposition,
} from "@/lib/services/dialer-service";
import { logCallAction } from "@/app/dashboard/dialer/actions";
import { AccountabilityFunnel } from "./accountability-funnel";
import { DialerKpiGrid } from "./dialer-kpi-grid";
import { CallingActivityCharts } from "./calling-activity-charts";
import { DialerHierarchyView } from "./dialer-hierarchy-view";
import { CaseCallingLedger } from "./case-calling-ledger";
import { CallDetailModal } from "./call-detail-modal";
import { QuickDialerModal } from "./quick-dialer-modal";
import * as XLSX from "xlsx";

interface DialerDashboardProps {
  initialData: DialerWorkspaceData;
}

export function DialerDashboard({ initialData }: DialerDashboardProps) {
  const [data, setData] = useState<DialerWorkspaceData>(initialData);
  const [activeTab, setActiveTab] = useState<"hierarchy" | "funnel" | "trends" | "cases">("hierarchy");
  const [hierarchyLevel, setHierarchyLevel] = useState<
    "client" | "bank" | "product" | "agency" | "tl" | "agent"
  >("bank");

  // Breadcrumb filter state
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [selectedAgency, setSelectedAgency] = useState<string | null>(null);
  const [selectedTL, setSelectedTL] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [datePreset, setDatePreset] = useState<string>("all");

  // Modals state
  const [selectedCaseForAudit, setSelectedCaseForAudit] = useState<DialerCaseRecord | null>(null);
  const [selectedCaseForDial, setSelectedCaseForDial] = useState<DialerCaseRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }

  // Handle drill-down from hierarchy rows
  function handleHierarchyDrillDown(
    type: "bank" | "product" | "agency" | "tl" | "agent",
    name: string
  ) {
    if (type === "bank") {
      setSelectedBank(name);
      setHierarchyLevel("product");
    } else if (type === "product") {
      setSelectedProduct(name);
      setHierarchyLevel("agency");
    } else if (type === "agency") {
      setSelectedAgency(name);
      setHierarchyLevel("tl");
    } else if (type === "tl") {
      setSelectedTL(name);
      setHierarchyLevel("agent");
    } else if (type === "agent") {
      setSelectedAgent(name);
      setActiveTab("cases");
    }
  }

  // Clear all breadcrumb filters
  function resetHierarchyFilters() {
    setSelectedBank(null);
    setSelectedProduct(null);
    setSelectedAgency(null);
    setSelectedTL(null);
    setSelectedAgent(null);
    setHierarchyLevel("bank");
  }

  // Handle logging a simulated live call
  async function handleCallLogged(input: {
    accountId: string;
    disposition: DialerDisposition;
    durationSeconds: number;
    ptpAmount?: number;
    ptpDate?: string;
    notes?: string;
  }) {
    const res = await logCallAction(input);
    if (res.success) {
      showToast(`Call logged successfully for ${res.call?.customerName}! Telemetry updated.`);
      // Update local state by mutating case list
      setData((prev) => {
        const nextCases = prev.cases.map((c) => {
          if (c.accountId === input.accountId && res.call) {
            return {
              ...c,
              callsAttempted: c.callsAttempted + 1,
              callsConnected: res.call.isConnected ? c.callsConnected + 1 : c.callsConnected,
              rpcCount: res.call.isRpc ? c.rpcCount + 1 : c.rpcCount,
              lastCallDate: res.call.callDate,
              lastCallDurationSeconds: res.call.durationSeconds,
              lastDisposition: res.call.disposition,
              ptpGenerated: res.call.ptpGenerated || c.ptpGenerated,
              ptpAmount: res.call.ptpGenerated ? res.call.ptpAmount : c.ptpAmount,
              callLogs: [res.call, ...c.callLogs],
            };
          }
          return c;
        });

        // Update overall metrics
        const updatedMetrics = { ...prev.metrics };
        updatedMetrics.totalCallsAttempted += 1;
        if (res.call?.isConnected) updatedMetrics.connectedCalls += 1;
        else updatedMetrics.notConnectedCalls += 1;
        if (res.call?.isRpc) updatedMetrics.rpcCount += 1;
        if (res.call?.ptpGenerated) {
          updatedMetrics.ptpGeneratedCount += 1;
          updatedMetrics.totalPtpAmount += res.call.ptpAmount;
        }

        return {
          ...prev,
          metrics: updatedMetrics,
          cases: nextCases,
        };
      });
    }
  }

  // Export full dialer report to Excel
  function exportDialerReport() {
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Executive Metrics
      const metricsData = [
        { Metric: "Total Cases Allocated", Value: data.metrics.totalAllocatedCases },
        { Metric: "Total Outstanding Amount (₹)", Value: data.metrics.totalOutstandingAmount },
        { Metric: "Calls Attempted", Value: data.metrics.totalCallsAttempted },
        { Metric: "Connected Calls", Value: data.metrics.connectedCalls },
        { Metric: "Not Connected Calls", Value: data.metrics.notConnectedCalls },
        { Metric: "Connect Rate (%)", Value: data.metrics.connectRate },
        { Metric: "Right Party Contacts (RPC)", Value: data.metrics.rpcCount },
        { Metric: "RPC Rate (%)", Value: data.metrics.rpcRate },
        { Metric: "PTP Generated Count", Value: data.metrics.ptpGeneratedCount },
        { Metric: "PTP Generated Rate (%)", Value: data.metrics.ptpGeneratedRate },
        { Metric: "Total PTP Amount (₹)", Value: data.metrics.totalPtpAmount },
        { Metric: "Kept PTP Count", Value: data.metrics.keptPtpCount },
        { Metric: "Broken PTP Count", Value: data.metrics.brokenPtpCount },
        { Metric: "PTP Conversion Rate (%)", Value: data.metrics.ptpConversionRate },
        { Metric: "Total Talk Time (Seconds)", Value: data.metrics.totalTalkTimeSeconds },
        { Metric: "Avg Call Duration (Seconds)", Value: data.metrics.averageCallDurationSeconds },
        { Metric: "Follow-up Pipeline Cases", Value: data.metrics.followUpCasesCount },
        { Metric: "Resolved Cases Count", Value: data.metrics.resolvedCasesCount },
        { Metric: "Case Resolution Rate (%)", Value: data.metrics.caseResolutionRate },
        { Metric: "Total Resolution Amount (₹)", Value: data.metrics.totalResolutionAmount },
        { Metric: "Calls Per Allocated Case", Value: data.metrics.callsPerAllocatedCase },
        { Metric: "Calls Per Resolved Case", Value: data.metrics.callsPerResolvedCase },
        { Metric: "Penetration Rate (%)", Value: data.metrics.penetrationRate },
      ];
      const wsMetrics = XLSX.utils.json_to_sheet(metricsData);
      XLSX.utils.book_append_sheet(wb, wsMetrics, "Dialer Metrics Summary");

      // Sheet 2: Agent Performance Rankings
      const wsAgents = XLSX.utils.json_to_sheet(
        data.agentAggregates.map((ag) => ({
          Rank: ag.rank,
          "Agent Name": ag.name,
          "Allocated Cases": ag.allocatedCases,
          "Outstanding Amount (₹)": ag.outstandingAmount,
          "Calls Attempted": ag.callsAttempted,
          "Connected Calls": ag.connectedCalls,
          "Not Connected": ag.notConnectedCalls,
          "Connect Rate (%)": ag.connectRate,
          "RPC Contacts": ag.rpcCount,
          "RPC Rate (%)": ag.rpcRate,
          "PTP Count": ag.ptpCount,
          "PTP Amount (₹)": ag.ptpAmount,
          "PTP Conversion (%)": ag.ptpConversionRate,
          "Broken PTP": ag.brokenPtpCount,
          "Avg Duration (s)": ag.averageCallDurationSeconds,
          "Follow-up Cases": ag.followUpCases,
          "Resolved Cases": ag.resolvedCases,
          "Resolution Amount (₹)": ag.resolutionAmount,
          "Productivity Score": ag.productivityScore,
        }))
      );
      XLSX.utils.book_append_sheet(wb, wsAgents, "Agent Performance");

      // Sheet 3: Cases Calling Ledger
      const wsCases = XLSX.utils.json_to_sheet(
        data.cases.map((c) => ({
          "Loan Number": c.loanNumber,
          "Borrower Name": c.customerName,
          "Phone Number": c.phoneNumber,
          "Client Bank": c.clientBank,
          Product: c.productType,
          Agency: c.agencyName,
          "Team Leader": c.teamLeaderName,
          Agent: c.agentName,
          "Outstanding (₹)": c.outstandingAmount,
          "Calls Attempted": c.callsAttempted,
          "Calls Connected": c.callsConnected,
          "RPC Count": c.rpcCount,
          "Last Call Date": c.lastCallDate || "N/A",
          "Last Disposition": c.lastDisposition || "Not Contacted",
          "PTP Generated": c.ptpGenerated ? "YES" : "NO",
          "PTP Amount (₹)": c.ptpAmount,
          "PTP Status": c.ptpStatus,
          "Resolution Status": c.resolutionStatus,
          "Resolution Amount (₹)": c.resolutionAmount,
        }))
      );
      XLSX.utils.book_append_sheet(wb, wsCases, "Cases Calling Ledger");

      XLSX.writeFile(wb, `Dialer_Performance_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
      showToast("Dialer Performance Report exported successfully!");
    } catch (err) {
      console.error(err);
      showToast("Failed to export Excel report.");
    }
  }

  // Filter cases displayed based on breadcrumb
  const filteredCases = data.cases.filter((c) => {
    if (selectedBank && c.clientBank !== selectedBank) return false;
    if (selectedProduct && c.productType !== selectedProduct) return false;
    if (selectedAgency && c.agencyName !== selectedAgency) return false;
    if (selectedTL && c.teamLeaderName !== selectedTL) return false;
    if (selectedAgent && c.agentName !== selectedAgent) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-emerald-500/90 text-white px-4 py-3 shadow-2xl backdrop-blur-md text-xs font-semibold animate-bounce">
          <CheckCircle2 className="h-4 w-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="dash-glass dash-hero-glow rounded-2xl px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#00F2FE]/15 text-[#00F2FE] shadow-lg shadow-[#00F2FE]/20">
              <PhoneCall className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="dash-section-title text-xl font-bold text-white sm:text-2xl">
                  Dialer Management &amp; Performance
                </h1>
                <span className="rounded-full bg-[#00F2FE]/10 border border-[#00F2FE]/30 px-2.5 py-0.5 text-xs font-semibold text-[#00F2FE]">
                  Telephony Analytics
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-300 sm:text-sm max-w-3xl leading-relaxed">
                Track agent-level calling activity, connect rates, right-party contacts, PTP generation, and measure
                how effectively allocated delinquent cases are resolved through the calling pipeline.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={exportDialerReport}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-white/10 hover:border-white/20 transition"
              title="Export complete calling audit report"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
              <span>Export MIS</span>
            </button>

            {data.cases[0] && (
              <button
                type="button"
                onClick={() => setSelectedCaseForDial(data.cases[0])}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#00F2FE] to-cyan-500 px-4 py-2.5 text-xs font-bold text-[#0B1120] hover:opacity-90 shadow-lg shadow-[#00F2FE]/20 transition"
              >
                <PhoneCall className="h-4 w-4" />
                <span>Simulate Call</span>
              </button>
            )}
          </div>
        </div>

        {/* Drilldown Breadcrumb Trail */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 font-semibold flex items-center gap-1.5 mr-1">
            <Filter className="h-3.5 w-3.5 text-[#00F2FE]" />
            Active Drilldown:
          </span>

          <button
            type="button"
            onClick={resetHierarchyFilters}
            className={`rounded-lg px-2.5 py-1 transition ${
              !selectedBank
                ? "bg-[#00F2FE]/20 border border-[#00F2FE]/40 text-[#00F2FE] font-bold"
                : "bg-white/5 text-slate-300 hover:text-white"
            }`}
          >
            All Clients / Banks
          </button>

          {selectedBank && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
              <button
                type="button"
                onClick={() => {
                  setSelectedProduct(null);
                  setSelectedAgency(null);
                  setSelectedTL(null);
                  setSelectedAgent(null);
                  setHierarchyLevel("product");
                }}
                className={`rounded-lg px-2.5 py-1 transition ${
                  selectedBank && !selectedProduct
                    ? "bg-[#00F2FE]/20 border border-[#00F2FE]/40 text-[#00F2FE] font-bold"
                    : "bg-white/5 text-slate-300 hover:text-white"
                }`}
              >
                Bank: {selectedBank}
              </button>
            </>
          )}

          {selectedProduct && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
              <button
                type="button"
                onClick={() => {
                  setSelectedAgency(null);
                  setSelectedTL(null);
                  setSelectedAgent(null);
                  setHierarchyLevel("agency");
                }}
                className={`rounded-lg px-2.5 py-1 transition ${
                  selectedProduct && !selectedAgency
                    ? "bg-[#00F2FE]/20 border border-[#00F2FE]/40 text-[#00F2FE] font-bold"
                    : "bg-white/5 text-slate-300 hover:text-white"
                }`}
              >
                Product: {selectedProduct}
              </button>
            </>
          )}

          {selectedAgency && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
              <button
                type="button"
                onClick={() => {
                  setSelectedTL(null);
                  setSelectedAgent(null);
                  setHierarchyLevel("tl");
                }}
                className={`rounded-lg px-2.5 py-1 transition ${
                  selectedAgency && !selectedTL
                    ? "bg-[#00F2FE]/20 border border-[#00F2FE]/40 text-[#00F2FE] font-bold"
                    : "bg-white/5 text-slate-300 hover:text-white"
                }`}
              >
                Agency: {selectedAgency}
              </button>
            </>
          )}

          {selectedTL && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
              <button
                type="button"
                onClick={() => {
                  setSelectedAgent(null);
                  setHierarchyLevel("agent");
                }}
                className={`rounded-lg px-2.5 py-1 transition ${
                  selectedTL && !selectedAgent
                    ? "bg-[#00F2FE]/20 border border-[#00F2FE]/40 text-[#00F2FE] font-bold"
                    : "bg-white/5 text-slate-300 hover:text-white"
                }`}
              >
                TL: {selectedTL}
              </button>
            </>
          )}

          {selectedAgent && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
              <span className="rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold px-2.5 py-1">
                Agent: {selectedAgent}
              </span>
            </>
          )}

          {(selectedBank || selectedProduct || selectedAgency || selectedTL || selectedAgent) && (
            <button
              type="button"
              onClick={resetHierarchyFilters}
              className="ml-auto text-[11px] text-[#00F2FE] hover:underline"
            >
              Reset Breadcrumb
            </button>
          )}
        </div>
      </div>

      {/* The Core Accountability Pipeline: Connects Calling Effort to Resolution */}
      <AccountabilityFunnel funnel={data.funnel} />

      {/* 15 Key Metrics KPI Grid */}
      <DialerKpiGrid metrics={data.metrics} />

      {/* Main Workspace Navigation Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("hierarchy")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === "hierarchy"
                ? "bg-[#00F2FE] text-[#0B1120] shadow-lg shadow-[#00F2FE]/20"
                : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/5"
            }`}
          >
            <Layers3 className="h-4 w-4" />
            <span>Hierarchy Dashboards ({hierarchyLevel.toUpperCase()})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("trends")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === "trends"
                ? "bg-[#00F2FE] text-[#0B1120] shadow-lg shadow-[#00F2FE]/20"
                : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/5"
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>Activity &amp; Hourly Trends</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("cases")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === "cases"
                ? "bg-[#00F2FE] text-[#0B1120] shadow-lg shadow-[#00F2FE]/20"
                : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/5"
            }`}
          >
            <PhoneCall className="h-4 w-4" />
            <span>Customer &amp; Case Ledger ({filteredCases.length})</span>
          </button>
        </div>

        {/* Quick Date Presets */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-400 font-medium">Timeline:</span>
          {["today", "last7", "last30", "all"].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setDatePreset(preset)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                datePreset === preset
                  ? "bg-white/20 text-white font-bold"
                  : "bg-white/5 text-slate-400 hover:text-white"
              }`}
            >
              {preset === "today"
                ? "Today"
                : preset === "last7"
                ? "Last 7D"
                : preset === "last30"
                ? "Last 30D"
                : "All Time"}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: Hierarchy View (Client, Bank, Product, Agency, TL, Agent) */}
      {activeTab === "hierarchy" && (
        <DialerHierarchyView
          currentLevel={hierarchyLevel}
          onLevelChange={setHierarchyLevel}
          data={{
            client: data.clientAggregates,
            bank: data.bankAggregates,
            product: data.productAggregates,
            agency: data.agencyAggregates,
            tl: data.tlAggregates,
            agent: data.agentAggregates,
          }}
          onDrillDown={handleHierarchyDrillDown}
        />
      )}

      {/* Tab 2: Activity & Hourly Trends */}
      {activeTab === "trends" && (
        <CallingActivityCharts
          dailyCallingActivity={data.dailyCallingActivity}
          hourlyDistribution={data.hourlyDistribution}
          dispositionBreakdown={data.dispositionBreakdown}
        />
      )}

      {/* Tab 3: Customer & Case Calling Ledger */}
      {activeTab === "cases" && (
        <CaseCallingLedger
          cases={filteredCases}
          onViewCaseLogs={(c) => setSelectedCaseForAudit(c)}
          onQuickDial={(c) => setSelectedCaseForDial(c)}
        />
      )}

      {/* Modal: Full Chronological Call Audit Trail */}
      <CallDetailModal
        caseRecord={selectedCaseForAudit}
        onClose={() => setSelectedCaseForAudit(null)}
      />

      {/* Modal: Live Dialer Simulator */}
      <QuickDialerModal
        caseRecord={selectedCaseForDial}
        onClose={() => setSelectedCaseForDial(null)}
        onCallLogged={handleCallLogged}
      />
    </div>
  );
}

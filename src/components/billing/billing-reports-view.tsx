"use client";

import { useState } from "react";
import {
  FileSpreadsheet,
  Building2,
  Package,
  ShieldCheck,
  Users,
  UserCheck,
  Calendar,
  Clock,
  CheckCircle2,
  FileText,
  TrendingUp,
  Search,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import * as XLSX from "xlsx";
import type {
  BillingReportsData,
  CaseBillingRecord,
} from "@/lib/services/billing-service";

interface BillingReportsViewProps {
  reports: BillingReportsData;
  onInspectCase: (record: CaseBillingRecord) => void;
}

type ReportTab =
  | "bank"
  | "product"
  | "agency"
  | "tl"
  | "agent"
  | "resolution"
  | "daily"
  | "monthly"
  | "approval"
  | "payout";

export function BillingReportsView({
  reports,
  onInspectCase,
}: BillingReportsViewProps) {
  const [activeTab, setActiveTab] = useState<ReportTab>("bank");
  const [searchQuery, setSearchQuery] = useState("");

  function formatInr(val: number) {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
    return `₹${val.toLocaleString("en-IN")}`;
  }

  function exportToExcel() {
    const wb = XLSX.utils.book_new();

    const bankData = reports.bankWise.map((r) => ({
      Bank: r.bank,
      "Resolved Cases": r.resolutionCount,
      "Collection Amount (INR)": r.collectionAmount,
      "Generated Billing (INR)": r.generatedBilling,
      "Approved Billing (INR)": r.approvedBilling,
      "Paid Payout (INR)": r.paidPayout,
      "Unpaid Payout (INR)": r.unpaidPayout,
      "Effective Rate (%)": r.effectiveRate,
      "Active Rule": r.activeRule,
    }));
    const wsBank = XLSX.utils.json_to_sheet(bankData);
    XLSX.utils.book_append_sheet(wb, wsBank, "Bank-wise Billing");

    const prodData = reports.productWise.map((r) => ({
      Product: r.product,
      "Resolved Cases": r.resolutionCount,
      "Collection Amount (INR)": r.collectionAmount,
      "Generated Billing (INR)": r.generatedBilling,
      "Approved Billing (INR)": r.approvedBilling,
      "Effective Rate (%)": r.effectiveRate,
    }));
    const wsProd = XLSX.utils.json_to_sheet(prodData);
    XLSX.utils.book_append_sheet(wb, wsProd, "Product-wise Billing");

    const agencyData = reports.agencyWise.map((r) => ({
      Agency: r.agency,
      "Resolved Cases": r.resolutionCount,
      "Collection Amount (INR)": r.collectionAmount,
      "Generated Billing (INR)": r.generatedBilling,
      "Approved Billing (INR)": r.approvedBilling,
      "Paid Payout (INR)": r.paidPayout,
      "Pending Payout (INR)": r.pendingPayout,
      "Net Payable After TDS (INR)": r.netPayableAfterTds,
    }));
    const wsAgency = XLSX.utils.json_to_sheet(agencyData);
    XLSX.utils.book_append_sheet(wb, wsAgency, "Agency-wise Billing");

    const tlData = reports.tlWise.map((r) => ({
      "Team Leader": r.teamLeader,
      Agency: r.agency,
      "Agents Count": r.agentCount,
      "Resolved Cases": r.resolutionCount,
      "Collection Amount (INR)": r.collectionAmount,
      "Generated Billing (INR)": r.generatedBilling,
      "Approved Billing (INR)": r.approvedBilling,
    }));
    const wsTL = XLSX.utils.json_to_sheet(tlData);
    XLSX.utils.book_append_sheet(wb, wsTL, "TL-wise Billing");

    const agentData = reports.agentWise.map((r) => ({
      "Agent Name": r.agentName,
      Agency: r.agency,
      "Team Leader": r.teamLeader,
      "Resolved Cases": r.resolutionCount,
      "Collection Amount (INR)": r.collectionAmount,
      "Applicable Rate": r.applicableRate,
      "Generated Billing (INR)": r.generatedBilling,
      "Approved Billing (INR)": r.approvedBilling,
      "Paid Amount (INR)": r.paidAmount,
      "Payment Status": r.paymentStatus,
    }));
    const wsAgent = XLSX.utils.json_to_sheet(agentData);
    XLSX.utils.book_append_sheet(wb, wsAgent, "Agent-wise Billing");

    const resData = reports.resolutionWise.map((r) => ({
      "Loan Number": r.loanNumber,
      Customer: r.customerName,
      Bank: r.clientBank,
      Product: r.productType,
      Bucket: r.bucket,
      Agency: r.agencyName,
      "Team Leader": r.teamLeaderName,
      Agent: r.agentName,
      "Resolution Date": r.resolutionDate,
      "Resolution Amount (INR)": r.resolutionAmount,
      "Rule Applied": r.matchedRuleName,
      "Formula Applied": r.rateFormulaApplied,
      "Calculated Billing (INR)": r.calculatedBilling,
      "Approved Billing (INR)": r.approvedBilling,
      "Approval Status": r.approvalStatus,
      "Payment Status": r.paymentStatus,
      "Payment Reference": r.paymentReference || "N/A",
    }));
    const wsRes = XLSX.utils.json_to_sheet(resData);
    XLSX.utils.book_append_sheet(wb, wsRes, "Resolution-wise Ledger");

    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Collection_Billing_Master_Report_${dateStr}.xlsx`);
  }

  const tabs: { id: ReportTab; label: string; icon: typeof Building2 }[] = [
    { id: "bank", label: "Bank-wise", icon: Building2 },
    { id: "product", label: "Product-wise", icon: Package },
    { id: "agency", label: "Agency-wise", icon: ShieldCheck },
    { id: "tl", label: "TL-wise", icon: Users },
    { id: "agent", label: "Agent-wise", icon: UserCheck },
    { id: "resolution", label: "Resolution-wise", icon: FileText },
    { id: "daily", label: "Daily Timeline", icon: Calendar },
    { id: "monthly", label: "Monthly Trends", icon: TrendingUp },
    { id: "approval", label: "Pending vs Approved", icon: Clock },
    { id: "payout", label: "Paid vs Unpaid", icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-6">
      <div className="dash-clay rounded-2xl border border-white/10 bg-[#0d1527]/90 p-5 shadow-xl backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-white/10 pb-4">
          <div>
            <h3 className="text-base font-semibold text-white">Commercial Financial Reports Hub</h3>
            <p className="mt-1 text-xs text-slate-400">
              Complete bank and agency revenue ledgers, volume slabs, timelines, and payout audit schedules.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search rows in active report..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-56 rounded-lg border border-white/10 bg-black/40 pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <button
              onClick={exportToExcel}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 transition-all shadow-md"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Export Master Excel (.xlsx)</span>
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearchQuery("");
                }}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 font-medium transition-all whitespace-nowrap shrink-0 ${
                  isActive
                    ? "border-cyan-500/50 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-white shadow-md shadow-cyan-500/10"
                    : "border-white/5 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? "text-cyan-400" : "text-slate-400"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "bank" && (
        <div className="space-y-4">
          <div className="dash-clay rounded-2xl border border-white/10 bg-[#0d1527]/90 p-5 shadow-xl">
            <h4 className="text-sm font-semibold text-white mb-3">Bank Portfolio Billing Comparison</h4>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reports.bankWise}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis dataKey="bank" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px" }}
                    formatter={(val: any) => [`₹${Number(val).toLocaleString("en-IN")}`, ""]}
                  />
                  <Legend />
                  <Bar dataKey="collectionAmount" name="Total Recovered (₹)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="generatedBilling" name="Generated Billing (₹)" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="dash-clay rounded-2xl border border-white/10 bg-[#0d1527]/90 p-5 shadow-xl overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 text-slate-400">
                <tr>
                  <th className="py-2 px-3">Bank Partner</th>
                  <th className="py-2 px-3 text-center">Resolutions</th>
                  <th className="py-2 px-3 text-right">Total Recovered</th>
                  <th className="py-2 px-3 text-right">Generated Billing</th>
                  <th className="py-2 px-3 text-right">Approved Billing</th>
                  <th className="py-2 px-3 text-right">Disbursed (Paid)</th>
                  <th className="py-2 px-3 text-right">Yield %</th>
                  <th className="py-2 px-3">Active Commercial Agreement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {reports.bankWise
                  .filter((r) => r.bank.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((row) => (
                    <tr key={row.bank} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-3 font-semibold text-white">{row.bank}</td>
                      <td className="py-3 px-3 text-center font-mono">{row.resolutionCount}</td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-blue-400">
                        {formatInr(row.collectionAmount)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                        {formatInr(row.generatedBilling)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-cyan-300">
                        {formatInr(row.approvedBilling)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-300">
                        {formatInr(row.paidPayout)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-white">
                        {row.effectiveRate}%
                      </td>
                      <td className="py-3 px-3 text-slate-400 text-[11px] truncate max-w-xs">{row.activeRule}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "product" && (
        <div className="dash-clay rounded-2xl border border-white/10 bg-[#0d1527]/90 p-5 shadow-xl overflow-x-auto">
          <h4 className="text-sm font-semibold text-white mb-4">Product Line Billing Ledger</h4>
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/10 text-slate-400">
              <tr>
                <th className="py-2 px-3">Loan Product</th>
                <th className="py-2 px-3 text-center">Resolutions</th>
                <th className="py-2 px-3 text-right">Collection Amount</th>
                <th className="py-2 px-3 text-right">Generated Billing</th>
                <th className="py-2 px-3 text-right">Approved Billing</th>
                <th className="py-2 px-3 text-right">Yield Rate %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {reports.productWise
                .filter((r) => r.product.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((row) => (
                  <tr key={row.product} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-3 font-semibold text-white">{row.product}</td>
                    <td className="py-3 px-3 text-center font-mono">{row.resolutionCount}</td>
                    <td className="py-3 px-3 text-right font-mono text-blue-400">{formatInr(row.collectionAmount)}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                      {formatInr(row.generatedBilling)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-cyan-300">{formatInr(row.approvedBilling)}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-white">{row.effectiveRate}%</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "agency" && (
        <div className="dash-clay rounded-2xl border border-white/10 bg-[#0d1527]/90 p-5 shadow-xl overflow-x-auto">
          <h4 className="text-sm font-semibold text-white mb-4">Agency Payout & Settlement Ledger</h4>
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/10 text-slate-400">
              <tr>
                <th className="py-2 px-3">Recovery Agency Partner</th>
                <th className="py-2 px-3 text-center">Resolutions</th>
                <th className="py-2 px-3 text-right">Total Recovered</th>
                <th className="py-2 px-3 text-right">Total Generated</th>
                <th className="py-2 px-3 text-right">Approved Billing</th>
                <th className="py-2 px-3 text-right">Disbursed (Paid)</th>
                <th className="py-2 px-3 text-right">Pending Payout</th>
                <th className="py-2 px-3 text-right">Net Payable (Post-TDS)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {reports.agencyWise
                .filter((r) => r.agency.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((row) => (
                  <tr key={row.agency} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-3 font-semibold text-white">{row.agency}</td>
                    <td className="py-3 px-3 text-center font-mono">{row.resolutionCount}</td>
                    <td className="py-3 px-3 text-right font-mono text-blue-400">{formatInr(row.collectionAmount)}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                      {formatInr(row.generatedBilling)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-cyan-300">{formatInr(row.approvedBilling)}</td>
                    <td className="py-3 px-3 text-right font-mono text-purple-400">{formatInr(row.paidPayout)}</td>
                    <td className="py-3 px-3 text-right font-mono text-amber-400">{formatInr(row.pendingPayout)}</td>
                    <td className="py-3 px-3 text-right font-mono font-extrabold text-cyan-400">
                      {formatInr(row.netPayableAfterTds)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "tl" && (
        <div className="dash-clay rounded-2xl border border-white/10 bg-[#0d1527]/90 p-5 shadow-xl overflow-x-auto">
          <h4 className="text-sm font-semibold text-white mb-4">Team Leader Team Performance & Billing</h4>
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/10 text-slate-400">
              <tr>
                <th className="py-2 px-3">Team Leader</th>
                <th className="py-2 px-3">Agency</th>
                <th className="py-2 px-3 text-center">Agents Active</th>
                <th className="py-2 px-3 text-center">Team Resolutions</th>
                <th className="py-2 px-3 text-right">Team Recovery Amount</th>
                <th className="py-2 px-3 text-right">Generated Agency Revenue</th>
                <th className="py-2 px-3 text-right">Approved Billing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {reports.tlWise
                .filter((r) => r.teamLeader.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((row) => (
                  <tr key={row.teamLeader} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-3 font-semibold text-white">{row.teamLeader}</td>
                    <td className="py-3 px-3 text-slate-400">{row.agency}</td>
                    <td className="py-3 px-3 text-center font-mono">{row.agentCount}</td>
                    <td className="py-3 px-3 text-center font-mono">{row.resolutionCount}</td>
                    <td className="py-3 px-3 text-right font-mono text-blue-400">{formatInr(row.collectionAmount)}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                      {formatInr(row.generatedBilling)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-cyan-300">{formatInr(row.approvedBilling)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "agent" && (
        <div className="dash-clay rounded-2xl border border-white/10 bg-[#0d1527]/90 p-5 shadow-xl overflow-x-auto">
          <h4 className="text-sm font-semibold text-white mb-4">Agent Resolution & Commission Ledger</h4>
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/10 text-slate-400">
              <tr>
                <th className="py-2 px-3">Agent Name</th>
                <th className="py-2 px-3">Agency / TL</th>
                <th className="py-2 px-3 text-center">Resolutions</th>
                <th className="py-2 px-3 text-right">Total Recovered</th>
                <th className="py-2 px-3">Applied Rate Logic</th>
                <th className="py-2 px-3 text-right">Generated Billing</th>
                <th className="py-2 px-3 text-right">Approved Amount</th>
                <th className="py-2 px-3 text-right">Disbursed (Paid)</th>
                <th className="py-2 px-3 text-center">Payout Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {reports.agentWise
                .filter((r) => r.agentName.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((row) => (
                  <tr key={row.agentId} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-3 font-semibold text-white">{row.agentName}</td>
                    <td className="py-3 px-3 text-slate-400">
                      {row.agency} • <span className="text-slate-300">TL: {row.teamLeader}</span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-blue-400">{row.resolutionCount}</td>
                    <td className="py-3 px-3 text-right font-mono text-blue-400">{formatInr(row.collectionAmount)}</td>
                    <td className="py-3 px-3 text-cyan-400 font-mono text-[11px] truncate max-w-xs">{row.applicableRate}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                      {formatInr(row.generatedBilling)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-cyan-300">{formatInr(row.approvedBilling)}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-300">{formatInr(row.paidAmount)}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-300">
                        {row.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "resolution" && (
        <div className="dash-clay rounded-2xl border border-white/10 bg-[#0d1527]/90 p-5 shadow-xl overflow-x-auto">
          <h4 className="text-sm font-semibold text-white mb-4">Detailed Case Resolution Billing Ledger</h4>
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/10 text-slate-400">
              <tr>
                <th className="py-2 px-3">Loan # / Customer</th>
                <th className="py-2 px-3">Bank / Product</th>
                <th className="py-2 px-3">Agent / Agency</th>
                <th className="py-2 px-3">Resolution Date</th>
                <th className="py-2 px-3 text-right">Collection (₹)</th>
                <th className="py-2 px-3">Applied Rule & Formula</th>
                <th className="py-2 px-3 text-right">Calculated Fee</th>
                <th className="py-2 px-3 text-center">Status</th>
                <th className="py-2 px-3 text-center">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {reports.resolutionWise
                .filter((r) =>
                  r.loanNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  r.customerName.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((row) => (
                  <tr key={row.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-3 font-semibold text-white">
                      {row.loanNumber}
                      <p className="text-[10px] text-slate-400 font-normal">{row.customerName}</p>
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      {row.clientBank}
                      <p className="text-[10px] text-slate-500">{row.productType} • {row.bucket}</p>
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      {row.agentName}
                      <p className="text-[10px] text-slate-500">{row.agencyName}</p>
                    </td>
                    <td className="py-3 px-3 text-slate-400">{row.resolutionDate}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                      ₹{row.resolutionAmount.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-3">
                      <p className="text-white text-xs truncate max-w-xs">{row.matchedRuleName}</p>
                      <p className="text-[10px] text-cyan-400 font-mono">{row.rateFormulaApplied}</p>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-white">
                      ₹{row.calculatedBilling.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400">
                        {row.approvalStatus}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => onInspectCase(row)}
                        className="rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[10px] text-cyan-300 hover:bg-cyan-500/20"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "daily" && (
        <div className="space-y-4">
          <div className="dash-clay rounded-2xl border border-white/10 bg-[#0d1527]/90 p-5 shadow-xl">
            <h4 className="text-sm font-semibold text-white mb-3">Daily Billing Generation Trend</h4>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={reports.dailyTimeline}>
                  <defs>
                    <linearGradient id="colorBill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px" }}
                    formatter={(val: any) => [`₹${Number(val).toLocaleString("en-IN")}`, ""]}
                  />
                  <Area
                    type="monotone"
                    dataKey="billingGenerated"
                    name="Daily Generated Billing (₹)"
                    stroke="#06b6d4"
                    fillOpacity={1}
                    fill="url(#colorBill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="dash-clay rounded-2xl border border-white/10 bg-[#0d1527]/90 p-5 shadow-xl overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 text-slate-400">
                <tr>
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3 text-center">Resolutions Count</th>
                  <th className="py-2 px-3 text-right">Total Recovered (₹)</th>
                  <th className="py-2 px-3 text-right">Generated Billing (₹)</th>
                  <th className="py-2 px-3 text-right">Approved Billing (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {reports.dailyTimeline.map((row) => (
                  <tr key={row.date} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-3 font-semibold text-white">{row.date}</td>
                    <td className="py-3 px-3 text-center font-mono">{row.resolutions}</td>
                    <td className="py-3 px-3 text-right font-mono text-blue-400">{formatInr(row.collectionAmount)}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                      {formatInr(row.billingGenerated)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-cyan-300">{formatInr(row.approvedBilling)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "monthly" && (
        <div className="dash-clay rounded-2xl border border-white/10 bg-[#0d1527]/90 p-5 shadow-xl overflow-x-auto">
          <h4 className="text-sm font-semibold text-white mb-4">Monthly Commercial Reconciliation</h4>
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/10 text-slate-400">
              <tr>
                <th className="py-2 px-3">Billing Month</th>
                <th className="py-2 px-3 text-center">Resolutions Count</th>
                <th className="py-2 px-3 text-right">Gross Collections</th>
                <th className="py-2 px-3 text-right">Billing Generated</th>
                <th className="py-2 px-3 text-right">Approved Billing</th>
                <th className="py-2 px-3 text-right">Disbursed (Paid)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {reports.monthlyTrend.map((row) => (
                <tr key={row.month} className="hover:bg-white/[0.02]">
                  <td className="py-3 px-3 font-semibold text-white font-mono">{row.month}</td>
                  <td className="py-3 px-3 text-center font-mono">{row.resolutions}</td>
                  <td className="py-3 px-3 text-right font-mono text-blue-400">{formatInr(row.collectionAmount)}</td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                    {formatInr(row.billingGenerated)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-cyan-300">{formatInr(row.approvedBilling)}</td>
                  <td className="py-3 px-3 text-right font-mono text-purple-400">{formatInr(row.paidPayout)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "approval" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="dash-clay rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 shadow-xl">
            <p className="text-xs text-amber-300 font-semibold uppercase tracking-wider">Pending Bank Approval</p>
            <p className="text-2xl font-bold text-white mt-2 font-mono">
              {formatInr(reports.pendingVsApproved.pendingAmount)}
            </p>
            <p className="text-xs text-slate-400 mt-1">{reports.pendingVsApproved.pendingCount} cases awaiting review</p>
          </div>

          <div className="dash-clay rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 shadow-xl">
            <p className="text-xs text-emerald-300 font-semibold uppercase tracking-wider">Approved for Payout</p>
            <p className="text-2xl font-bold text-white mt-2 font-mono">
              {formatInr(reports.pendingVsApproved.approvedAmount)}
            </p>
            <p className="text-xs text-slate-400 mt-1">{reports.pendingVsApproved.approvedCount} cases verified</p>
          </div>

          <div className="dash-clay rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5 shadow-xl">
            <p className="text-xs text-rose-300 font-semibold uppercase tracking-wider">On Compliance Hold</p>
            <p className="text-2xl font-bold text-white mt-2 font-mono">
              {formatInr(reports.pendingVsApproved.heldAmount)}
            </p>
            <p className="text-xs text-slate-400 mt-1">{reports.pendingVsApproved.heldCount} cases pending NOC</p>
          </div>

          <div className="dash-clay rounded-2xl border border-slate-500/20 bg-slate-500/5 p-5 shadow-xl">
            <p className="text-xs text-slate-300 font-semibold uppercase tracking-wider">Disputed Items</p>
            <p className="text-2xl font-bold text-white mt-2 font-mono">
              {formatInr(reports.pendingVsApproved.disputedAmount)}
            </p>
            <p className="text-xs text-slate-400 mt-1">{reports.pendingVsApproved.disputedCount} under client dispute</p>
          </div>
        </div>
      )}

      {activeTab === "payout" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="dash-clay rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5 shadow-xl">
            <p className="text-xs text-cyan-300 font-semibold uppercase tracking-wider">Disbursed (Paid to Agency)</p>
            <p className="text-2xl font-bold text-white mt-2 font-mono">
              {formatInr(reports.paidVsUnpaid.paidAmount)}
            </p>
            <p className="text-xs text-slate-400 mt-1">{reports.paidVsUnpaid.paidCount} settlements completed with UTR</p>
          </div>

          <div className="dash-clay rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5 shadow-xl">
            <p className="text-xs text-indigo-300 font-semibold uppercase tracking-wider">Treasury Processing</p>
            <p className="text-2xl font-bold text-white mt-2 font-mono">
              {formatInr(reports.paidVsUnpaid.processingAmount)}
            </p>
            <p className="text-xs text-slate-400 mt-1">{reports.paidVsUnpaid.processingCount} payouts in banking queue</p>
          </div>

          <div className="dash-clay rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 shadow-xl">
            <p className="text-xs text-amber-300 font-semibold uppercase tracking-wider">Pending Unpaid</p>
            <p className="text-2xl font-bold text-white mt-2 font-mono">
              {formatInr(reports.paidVsUnpaid.unpaidAmount)}
            </p>
            <p className="text-xs text-slate-400 mt-1">{reports.paidVsUnpaid.unpaidCount} cases scheduled for next cycle</p>
          </div>
        </div>
      )}
    </div>
  );
}

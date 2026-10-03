"use client";

import { useState } from "react";
import {
  ChevronRight,
  Building2,
  Package,
  ShieldCheck,
  UserCheck,
  Users,
  FileText,
  Search,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import type {
  DrilldownHierarchyItem,
  CaseBillingRecord,
} from "@/lib/services/billing-service";

interface BillingHierarchyDrilldownProps {
  hierarchy: DrilldownHierarchyItem[];
  onInspectCase: (record: CaseBillingRecord) => void;
}

export function BillingHierarchyDrilldown({
  hierarchy,
  onInspectCase,
}: BillingHierarchyDrilldownProps) {
  const [selectedBank, setSelectedBank] = useState<DrilldownHierarchyItem | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<DrilldownHierarchyItem | null>(null);
  const [selectedAgency, setSelectedAgency] = useState<DrilldownHierarchyItem | null>(null);
  const [selectedTL, setSelectedTL] = useState<DrilldownHierarchyItem | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<DrilldownHierarchyItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  function formatInr(val: number) {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
    return `₹${val.toLocaleString("en-IN")}`;
  }

  let currentLevelTitle = "Bank Portfolios";
  let currentLevelSubtitle = "Select a bank to drill down into product lines and agency performance";
  let currentItems: DrilldownHierarchyItem[] = hierarchy;
  let activeCases: CaseBillingRecord[] | null = null;

  if (selectedAgent) {
    currentLevelTitle = `Agent Case Ledger: ${selectedAgent.name}`;
    currentLevelSubtitle = `Showing all individual case resolutions and calculated commercial fees`;
    activeCases = selectedAgent.caseRecords || [];
  } else if (selectedTL) {
    currentLevelTitle = `Team Leader: ${selectedTL.name} (Agents)`;
    currentLevelSubtitle = `Select an agent to inspect individual case resolutions and billing formulas`;
    currentItems = selectedTL.children || [];
  } else if (selectedAgency) {
    currentLevelTitle = `Agency: ${selectedAgency.name} (Team Leaders)`;
    currentLevelSubtitle = `Select a Team Leader to view individual agent payouts`;
    currentItems = selectedAgency.children || [];
  } else if (selectedProduct) {
    currentLevelTitle = `Product: ${selectedProduct.name} (Recovery Agencies)`;
    currentLevelSubtitle = `Select an authorized agency partner to view their team breakdown`;
    currentItems = selectedProduct.children || [];
  } else if (selectedBank) {
    currentLevelTitle = `Bank: ${selectedBank.name} (Loan Products)`;
    currentLevelSubtitle = `Select a credit or loan portfolio to inspect agency performance`;
    currentItems = selectedBank.children || [];
  }

  const filteredItems = currentItems.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.applicableRuleName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCases = activeCases?.filter((c) =>
    c.loanNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.matchedRuleName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const levelBadges = [
    { name: "Bank", active: !selectedBank, icon: Building2 },
    { name: "Product", active: selectedBank && !selectedProduct, icon: Package },
    { name: "Agency", active: selectedProduct && !selectedAgency, icon: ShieldCheck },
    { name: "Team Leader", active: selectedAgency && !selectedTL, icon: Users },
    { name: "Agent", active: selectedTL && !selectedAgent, icon: UserCheck },
    { name: "Resolved Cases", active: !!selectedAgent, icon: FileText },
  ];

  return (
    <div className="space-y-4">
      {/* Visual Hierarchy Flow Header */}
      <div className="dash-clay rounded-2xl border border-white/10 bg-[#0d1527]/90 p-4 shadow-xl backdrop-blur-xl">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              <h3 className="text-base font-semibold text-white tracking-wide">
                Resolution-to-Billing Commercial Flow
              </h3>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Interactive 6-tier traceability drilldown: Bank → Product → Agency → TL → Agent → Case
            </p>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {levelBadges.map((badge, idx) => {
              const Icon = badge.icon;
              return (
                <div key={badge.name} className="flex items-center gap-1.5 shrink-0">
                  <div
                    className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                      badge.active
                        ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-300 ring-1 ring-cyan-500/30"
                        : "border-white/5 bg-white/5 text-slate-400"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{badge.name}</span>
                  </div>
                  {idx < levelBadges.length - 1 && (
                    <ChevronRight className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Interactive Breadcrumbs */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-white/5 pt-3 text-xs">
          <button
            onClick={() => {
              setSelectedBank(null);
              setSelectedProduct(null);
              setSelectedAgency(null);
              setSelectedTL(null);
              setSelectedAgent(null);
            }}
            className={`flex items-center gap-1 rounded-md px-2 py-1 transition-colors ${
              !selectedBank
                ? "bg-cyan-500/20 text-cyan-300 font-semibold"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            All Banks
          </button>

          {selectedBank && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
              <button
                onClick={() => {
                  setSelectedProduct(null);
                  setSelectedAgency(null);
                  setSelectedTL(null);
                  setSelectedAgent(null);
                }}
                className={`flex items-center gap-1 rounded-md px-2 py-1 transition-colors ${
                  !selectedProduct
                    ? "bg-cyan-500/20 text-cyan-300 font-semibold"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Package className="h-3.5 w-3.5" />
                {selectedBank.name}
              </button>
            </>
          )}

          {selectedProduct && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
              <button
                onClick={() => {
                  setSelectedAgency(null);
                  setSelectedTL(null);
                  setSelectedAgent(null);
                }}
                className={`flex items-center gap-1 rounded-md px-2 py-1 transition-colors ${
                  !selectedAgency
                    ? "bg-cyan-500/20 text-cyan-300 font-semibold"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                {selectedProduct.name}
              </button>
            </>
          )}

          {selectedAgency && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
              <button
                onClick={() => {
                  setSelectedTL(null);
                  setSelectedAgent(null);
                }}
                className={`flex items-center gap-1 rounded-md px-2 py-1 transition-colors ${
                  !selectedTL
                    ? "bg-cyan-500/20 text-cyan-300 font-semibold"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                {selectedAgency.name}
              </button>
            </>
          )}

          {selectedTL && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
              <button
                onClick={() => {
                  setSelectedAgent(null);
                }}
                className={`flex items-center gap-1 rounded-md px-2 py-1 transition-colors ${
                  !selectedAgent
                    ? "bg-cyan-500/20 text-cyan-300 font-semibold"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <UserCheck className="h-3.5 w-3.5" />
                TL: {selectedTL.name}
              </button>
            </>
          )}

          {selectedAgent && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
              <span className="flex items-center gap-1 rounded-md bg-cyan-500/20 px-2 py-1 font-semibold text-cyan-300">
                <FileText className="h-3.5 w-3.5" />
                Agent: {selectedAgent.name}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Main Hierarchy Table */}
      <div className="dash-clay rounded-2xl border border-white/10 bg-[#0d1527]/90 p-5 shadow-xl backdrop-blur-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-4">
          <div>
            <h4 className="text-base font-semibold text-white">{currentLevelTitle}</h4>
            <p className="text-xs text-slate-400">{currentLevelSubtitle}</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search in view..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-56 rounded-lg border border-white/10 bg-black/30 pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
            {selectedBank && (
              <button
                onClick={() => {
                  if (selectedAgent) setSelectedAgent(null);
                  else if (selectedTL) setSelectedTL(null);
                  else if (selectedAgency) setSelectedAgency(null);
                  else if (selectedProduct) setSelectedProduct(null);
                  else if (selectedBank) setSelectedBank(null);
                }}
                className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/10 transition-colors"
              >
                ← Back Up
              </button>
            )}
          </div>
        </div>

        {selectedAgent && filteredCases ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 text-slate-400">
                <tr>
                  <th className="py-2.5 px-3 font-medium">Loan # / Account</th>
                  <th className="py-2.5 px-3 font-medium">Borrower</th>
                  <th className="py-2.5 px-3 font-medium">Bucket</th>
                  <th className="py-2.5 px-3 font-medium">Resolution Date</th>
                  <th className="py-2.5 px-3 font-medium text-right">Collection Amount</th>
                  <th className="py-2.5 px-3 font-medium">Applicable Rule & Rate</th>
                  <th className="py-2.5 px-3 font-medium text-right">Generated Billing</th>
                  <th className="py-2.5 px-3 font-medium">Approval</th>
                  <th className="py-2.5 px-3 font-medium">Payment</th>
                  <th className="py-2.5 px-3 font-medium text-center">Audit Trace</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {filteredCases.map((record) => (
                  <tr key={record.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-3 px-3">
                      <p className="font-semibold text-white font-mono text-xs">{record.loanNumber}</p>
                      <p className="text-[10px] text-slate-400">{record.clientBank} • {record.productType}</p>
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-medium text-slate-200">{record.customerName}</p>
                    </td>
                    <td className="py-3 px-3">
                      <span className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-mono text-slate-300">
                        {record.bucket}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <p className="text-slate-300">{record.resolutionDate}</p>
                      <p className="text-[10px] text-slate-500 capitalize">{record.resolutionType.replace("_", " ")}</p>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <p className="font-semibold text-emerald-400 font-mono">
                        ₹{record.resolutionAmount.toLocaleString("en-IN")}
                      </p>
                    </td>
                    <td className="py-3 px-3">
                      <p className="text-white text-xs truncate max-w-[200px]" title={record.matchedRuleName}>
                        {record.matchedRuleName}
                      </p>
                      <p className="text-[10px] text-cyan-400 font-mono">{record.rateFormulaApplied}</p>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <p className="font-bold text-white font-mono text-xs">
                        ₹{record.calculatedBilling.toLocaleString("en-IN")}
                      </p>
                      <p className="text-[10px] text-slate-400">{record.effectiveRatePct}% yield</p>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border ${
                          record.approvalStatus === "approved"
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                            : record.approvalStatus === "pending_approval"
                            ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                            : record.approvalStatus === "held"
                            ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
                            : "border-slate-500/30 bg-slate-500/10 text-slate-400"
                        }`}
                      >
                        {record.approvalStatus === "approved" ? "Approved" : "Pending"}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border ${
                          record.paymentStatus === "paid"
                            ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-400"
                            : record.paymentStatus === "processing"
                            ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-400"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                        }`}
                      >
                        {record.paymentStatus === "paid" ? "Paid" : "Unpaid"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => onInspectCase(record)}
                        className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[11px] font-medium text-cyan-300 hover:bg-cyan-500/20 transition-colors inline-flex items-center gap-1"
                        title="View Complete Provenance Audit Trail"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Audit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 text-slate-400">
                <tr>
                  <th className="py-2.5 px-3 font-medium">Entity / Level</th>
                  <th className="py-2.5 px-3 font-medium text-center">Resolved Cases</th>
                  <th className="py-2.5 px-3 font-medium text-right">Collection Amount</th>
                  <th className="py-2.5 px-3 font-medium">Applicable Payout Rule / Rate</th>
                  <th className="py-2.5 px-3 font-medium text-right">Generated Billing</th>
                  <th className="py-2.5 px-3 font-medium text-right">Approved Billing</th>
                  <th className="py-2.5 px-3 font-medium text-right">Effective Yield</th>
                  <th className="py-2.5 px-3 font-medium text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {filteredItems.map((item) => {
                  const Icon =
                    item.level === "bank"
                      ? Building2
                      : item.level === "product"
                      ? Package
                      : item.level === "agency"
                      ? ShieldCheck
                      : item.level === "tl"
                      ? Users
                      : UserCheck;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-white/[0.04] transition-colors cursor-pointer group"
                      onClick={() => {
                        if (item.level === "bank") setSelectedBank(item);
                        else if (item.level === "product") setSelectedProduct(item);
                        else if (item.level === "agency") setSelectedAgency(item);
                        else if (item.level === "tl") setSelectedTL(item);
                        else if (item.level === "agent") setSelectedAgent(item);
                      }}
                    >
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="rounded-lg border border-white/10 bg-white/5 p-2 text-cyan-400 group-hover:border-cyan-500/40 group-hover:bg-cyan-500/10 transition-colors">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-white group-hover:text-cyan-300 transition-colors">
                              {item.name}
                            </p>
                            <p className="text-[10px] text-slate-400 capitalize">
                              {item.level === "tl" ? "Team Leader" : item.level} View
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-0.5 font-mono font-medium text-blue-400 text-xs">
                          {item.resolvedCasesCount}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <p className="font-bold text-emerald-400 font-mono text-xs">
                          {formatInr(item.resolutionAmount)}
                        </p>
                      </td>
                      <td className="py-3.5 px-3">
                        <p className="text-white text-xs font-medium">{item.applicableRuleName}</p>
                        <p className="text-[10px] text-cyan-400 font-mono">{item.applicableRateText}</p>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <p className="font-bold text-white font-mono text-sm">
                          {formatInr(item.generatedBilling)}
                        </p>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <p className="font-semibold text-cyan-400 font-mono text-xs">
                          {formatInr(item.approvedBilling)}
                        </p>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <span className="font-mono text-xs font-semibold text-slate-300">
                          {item.effectiveYieldPct}%
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-200 group-hover:border-cyan-500 group-hover:bg-cyan-500/20 group-hover:text-cyan-300 transition-all"
                        >
                          <span>{item.level === "agent" ? "View Cases" : "Drill Down"}</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {filteredItems.length === 0 && !selectedAgent && (
          <div className="py-12 text-center text-slate-400">
            <p className="text-sm">No items found matching the current search query.</p>
          </div>
        )}
      </div>
    </div>
  );
}

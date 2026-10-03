"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Banknote,
  Sliders,
  FileSpreadsheet,
  ShieldCheck,
  Building2,
  Search,
  RefreshCw,
  Printer,
} from "lucide-react";
import type {
  BillingWorkspaceData,
  CaseBillingRecord,
  BillingFilterState,
} from "@/lib/services/billing-service";
import { BillingKpiGrid } from "./billing-kpi-grid";
import { BillingHierarchyDrilldown } from "./billing-hierarchy-drilldown";
import { BillingRulesManager } from "./billing-rules-manager";
import { BillingReportsView } from "./billing-reports-view";
import { BillingAuditTrail } from "./billing-audit-trail";
import { BillingInvoiceModal } from "./billing-invoice-modal";

interface BillingDashboardProps {
  initialData: BillingWorkspaceData;
}

type MainTab = "hierarchy" | "rules" | "reports" | "audit";

export function BillingDashboard({ initialData }: BillingDashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<MainTab>("hierarchy");
  const [data] = useState<BillingWorkspaceData>(initialData);
  const [activeInspectedCase, setActiveInspectedCase] = useState<CaseBillingRecord | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [selectedBank, setSelectedBank] = useState(initialData.filters.bank || "all");
  const [selectedProduct, setSelectedProduct] = useState(initialData.filters.product || "all");
  const [selectedAgency, setSelectedAgency] = useState(initialData.filters.agency || "all");
  const [selectedPreset, setSelectedPreset] = useState(initialData.filters.datePreset || "all");
  const [searchQuery, setSearchQuery] = useState(initialData.filters.searchQuery || "");

  function applyFilters(newFilters: Partial<BillingFilterState>) {
    const params = new URLSearchParams(searchParams.toString());
    const merged = {
      bank: selectedBank,
      product: selectedProduct,
      agency: selectedAgency,
      preset: selectedPreset,
      q: searchQuery,
      ...newFilters,
    };

    if (merged.bank && merged.bank !== "all") params.set("bank", merged.bank);
    else params.delete("bank");

    if (merged.product && merged.product !== "all") params.set("product", merged.product);
    else params.delete("product");

    if (merged.agency && merged.agency !== "all") params.set("agency", merged.agency);
    else params.delete("agency");

    if (merged.preset && merged.preset !== "all") params.set("preset", merged.preset);
    else params.delete("preset");

    if (merged.q && merged.q.trim()) params.set("q", merged.q.trim());
    else params.delete("q");

    router.push(`${pathname}?${params.toString()}`);
  }

  function handleRefresh() {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 600);
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="dash-clay relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-[#0d1527] via-[#0e1726] to-[#0a101d] p-6 shadow-2xl backdrop-blur-2xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-black shadow-lg shadow-cyan-500/20 font-bold">
                <Banknote className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white lg:text-2xl">
                  Bank & Agency Billing & Payout Module
                </h1>
                <p className="text-xs text-slate-400">
                  Resolution-driven commercial billing calculations, configurable payout rules, and audit traceability.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsInvoiceModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10 transition-colors shadow-sm"
            >
              <Printer className="h-3.5 w-3.5 text-cyan-400" />
              <span>Generate Tax Invoice</span>
            </button>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 hover:bg-white/10 transition-colors"
              title="Refresh Telemetry"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-cyan-400" : ""}`} />
            </button>
          </div>
        </div>

        {/* Global Filter Bar */}
        <div className="mt-5 grid grid-cols-1 gap-3 border-t border-white/10 pt-4 sm:grid-cols-2 md:grid-cols-5 lg:grid-cols-6 items-center">
          <div>
            <label className="text-[10px] uppercase font-semibold text-slate-400">Client Bank</label>
            <select
              value={selectedBank}
              onChange={(e) => {
                setSelectedBank(e.target.value);
                applyFilters({ bank: e.target.value });
              }}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
            >
              <option value="all" className="bg-slate-900">All Banks</option>
              {data.filterOptions.banks.map((b) => (
                <option key={b} value={b} className="bg-slate-900">{b}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase font-semibold text-slate-400">Product Portfolio</label>
            <select
              value={selectedProduct}
              onChange={(e) => {
                setSelectedProduct(e.target.value);
                applyFilters({ product: e.target.value });
              }}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
            >
              <option value="all" className="bg-slate-900">All Products</option>
              {data.filterOptions.products.map((p) => (
                <option key={p} value={p} className="bg-slate-900">{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase font-semibold text-slate-400">Recovery Agency</label>
            <select
              value={selectedAgency}
              onChange={(e) => {
                setSelectedAgency(e.target.value);
                applyFilters({ agency: e.target.value });
              }}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
            >
              <option value="all" className="bg-slate-900">All Agencies</option>
              {data.filterOptions.agencies.map((a) => (
                <option key={a} value={a} className="bg-slate-900">{a}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase font-semibold text-slate-400">Date Range</label>
            <select
              value={selectedPreset}
              onChange={(e) => {
                setSelectedPreset(e.target.value);
                applyFilters({ datePreset: e.target.value as any });
              }}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
            >
              <option value="all" className="bg-slate-900">All Time</option>
              <option value="today" className="bg-slate-900">Today</option>
              <option value="yesterday" className="bg-slate-900">Yesterday</option>
              <option value="last7" className="bg-slate-900">Last 7 Days</option>
              <option value="last30" className="bg-slate-900">Last 30 Days</option>
              <option value="this_month" className="bg-slate-900">This Month</option>
              <option value="last_month" className="bg-slate-900">Last Month</option>
            </select>
          </div>

          <div className="sm:col-span-2 md:col-span-1 lg:col-span-2">
            <label className="text-[10px] uppercase font-semibold text-slate-400">Keyword Search</label>
            <div className="relative mt-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Loan #, borrower, agent..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applyFilters({ searchQuery });
                }}
                className="w-full rounded-lg border border-white/10 bg-black/40 pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Performance Summary Grid */}
      <BillingKpiGrid kpis={data.kpis} />

      {/* Main Feature Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 text-xs">
        <button
          onClick={() => setActiveTab("hierarchy")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-semibold transition-all ${
            activeTab === "hierarchy"
              ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-500/10"
              : "text-slate-400 hover:bg-white/5 hover:text-white"
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Hierarchy Drilldown (Bank → Agent)</span>
        </button>

        <button
          onClick={() => setActiveTab("rules")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-semibold transition-all ${
            activeTab === "rules"
              ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-500/10"
              : "text-slate-400 hover:bg-white/5 hover:text-white"
          }`}
        >
          <Sliders className="h-4 w-4" />
          <span>Configurable Rules & Sandbox</span>
        </button>

        <button
          onClick={() => setActiveTab("reports")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-semibold transition-all ${
            activeTab === "reports"
              ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-500/10"
              : "text-slate-400 hover:bg-white/5 hover:text-white"
          }`}
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>Financial Reports Hub (10 Reports)</span>
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-semibold transition-all ${
            activeTab === "audit"
              ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-500/10"
              : "text-slate-400 hover:bg-white/5 hover:text-white"
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Billing Audit Trail & Traceability</span>
        </button>
      </div>

      {activeTab === "hierarchy" && (
        <BillingHierarchyDrilldown
          hierarchy={data.hierarchy}
          onInspectCase={(record) => {
            setActiveInspectedCase(record);
            setActiveTab("audit");
          }}
        />
      )}

      {activeTab === "rules" && (
        <BillingRulesManager
          rules={data.rules}
          filterOptions={{
            banks: data.filterOptions.banks,
            products: data.filterOptions.products,
            agencies: data.filterOptions.agencies,
            buckets: data.filterOptions.buckets,
          }}
          onRuleUpdated={handleRefresh}
        />
      )}

      {activeTab === "reports" && (
        <BillingReportsView
          reports={data.reports}
          onInspectCase={(record) => {
            setActiveInspectedCase(record);
            setActiveTab("audit");
          }}
        />
      )}

      {activeTab === "audit" && (
        <BillingAuditTrail
          records={data.allRecords}
          activeRecord={activeInspectedCase}
          onSelectRecord={setActiveInspectedCase}
          onRefresh={handleRefresh}
        />
      )}

      <BillingInvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        reports={data.reports}
      />
    </div>
  );
}

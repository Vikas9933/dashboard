"use client";

import { useState } from "react";
import {
  Sliders,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Calculator,
} from "lucide-react";
import type {
  BillingRule,
  BillingRuleType,
  SlabAmountTier,
  SlabCountTier,
} from "@/lib/services/billing-service";
import {
  saveBillingRuleAction,
  deleteBillingRuleAction,
  toggleBillingRuleAction,
  recalculateBillingAction,
} from "@/app/dashboard/billing/actions";
import { matchAndCalculateBilling } from "@/lib/services/billing-service";

interface BillingRulesManagerProps {
  rules: BillingRule[];
  filterOptions: {
    banks: string[];
    products: string[];
    agencies: string[];
    buckets: string[];
  };
  onRuleUpdated: () => void;
}

export function BillingRulesManager({
  rules,
  filterOptions,
  onRuleUpdated,
}: BillingRulesManagerProps) {
  const [ruleList, setRuleList] = useState<BillingRule[]>(rules);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<BillingRule | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Real-time Sandbox Calculator State
  const [simBank, setSimBank] = useState("HDFC Bank");
  const [simProduct, setSimProduct] = useState("Credit Cards");
  const [simBucket, setSimBucket] = useState("B2");
  const [simAgency, setSimAgency] = useState("Apex Recovery Services");
  const [simAmount, setSimAmount] = useState(85000);
  const [simCount, setSimCount] = useState(18);

  // Form State for Adding / Editing a Rule
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formType, setFormType] = useState<BillingRuleType>("percentage");
  const [formBank, setFormBank] = useState("All");
  const [formProduct, setFormProduct] = useState("All");
  const [formBucket, setFormBucket] = useState("All");
  const [formAgency, setFormAgency] = useState("All");
  const [formPctRate, setFormPctRate] = useState<number>(6.5);
  const [formFixedAmt, setFormFixedAmt] = useState<number>(500);
  const [formPriority, setFormPriority] = useState<number>(50);
  const [formApplyGst, setFormApplyGst] = useState(true);
  const [formApplyTds, setFormApplyTds] = useState(true);

  const [amountSlabs, setAmountSlabs] = useState<SlabAmountTier[]>([
    { min: 0, max: 50000, rate: 5.0 },
    { min: 50001, max: 200000, rate: 7.5 },
    { min: 200001, max: 0, rate: 10.0 },
  ]);

  const [countSlabs, setCountSlabs] = useState<SlabCountTier[]>([
    { min: 1, max: 15, feePerCase: 400 },
    { min: 16, max: 35, feePerCase: 600 },
    { min: 36, max: 0, feePerCase: 850 },
  ]);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }

  function handleOpenCreateModal() {
    setEditingRule(null);
    setFormName("");
    setFormDesc("");
    setFormType("percentage");
    setFormBank("All");
    setFormProduct("All");
    setFormBucket("All");
    setFormAgency("All");
    setFormPctRate(6.5);
    setFormFixedAmt(500);
    setFormPriority(50);
    setFormApplyGst(true);
    setFormApplyTds(true);
    setIsModalOpen(true);
  }

  function handleOpenEditModal(rule: BillingRule) {
    setEditingRule(rule);
    setFormName(rule.name);
    setFormDesc(rule.description);
    setFormType(rule.ruleType);
    setFormBank(rule.clientBank);
    setFormProduct(rule.productType);
    setFormBucket(rule.bucket);
    setFormAgency(rule.agencyName);
    setFormPctRate(rule.percentageRate || 0);
    setFormFixedAmt(rule.fixedAmount || 0);
    setFormPriority(rule.priority || 50);
    setFormApplyGst(rule.applyGst);
    setFormApplyTds(rule.applyTds);
    if (rule.slabAmountConfig) setAmountSlabs(rule.slabAmountConfig);
    if (rule.slabCountConfig) setCountSlabs(rule.slabCountConfig);
    setIsModalOpen(true);
  }

  async function handleSaveRule(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) return;

    setIsSaving(true);
    const rulePayload = {
      id: editingRule ? editingRule.id : undefined,
      name: formName.trim(),
      description: formDesc.trim(),
      ruleType: formType,
      clientBank: formBank,
      productType: formProduct,
      bucket: formBucket,
      agencyName: formAgency,
      percentageRate: formPctRate,
      fixedAmount: formFixedAmt,
      priority: formPriority,
      applyGst: formApplyGst,
      applyTds: formApplyTds,
      slabAmountConfig: formType === "slab_amount" ? amountSlabs : undefined,
      slabCountConfig: formType === "slab_count" ? countSlabs : undefined,
    };

    const res = await saveBillingRuleAction(rulePayload);
    setIsSaving(false);

    if (res.success) {
      setIsModalOpen(false);
      showToast(`Billing Rule "${res.rule.name}" saved successfully!`);
      const updated = [...ruleList];
      const idx = updated.findIndex((r) => r.id === res.rule.id);
      if (idx >= 0) updated[idx] = res.rule;
      else updated.unshift(res.rule);
      setRuleList(updated);
      onRuleUpdated();
    }
  }

  async function handleToggleRule(ruleId: string, currentActive: boolean) {
    const nextState = !currentActive;
    const res = await toggleBillingRuleAction(ruleId, nextState);
    if (res.success) {
      setRuleList((prev) =>
        prev.map((r) => (r.id === ruleId ? { ...r, isActive: nextState } : r))
      );
      showToast(`Rule status updated to ${nextState ? "Active" : "Inactive"}`);
      onRuleUpdated();
    }
  }

  async function handleDeleteRule(ruleId: string) {
    if (!confirm("Are you sure you want to delete this commercial billing rule?")) return;
    const res = await deleteBillingRuleAction(ruleId);
    if (res.success) {
      setRuleList((prev) => prev.filter((r) => r.id !== ruleId));
      showToast("Billing rule deleted successfully");
      onRuleUpdated();
    }
  }

  async function handleRecalculate() {
    setIsRecalculating(true);
    const res = await recalculateBillingAction();
    setIsRecalculating(false);
    if (res.success) {
      showToast(`Recalculated ${res.updatedCount} pending cases against latest rules!`);
      onRuleUpdated();
    }
  }

  const simResult = matchAndCalculateBilling(
    {
      accountId: "acc-sim",
      loanNumber: "LN-SIM-999",
      customerName: "Simulation User",
      clientBank: simBank,
      productType: simProduct,
      bucket: simBucket,
      agencyName: simAgency,
      teamLeaderName: "TL Simulation",
      agentId: "ag-sim",
      agentName: "Agent Simulation",
      resolutionDate: new Date().toISOString().slice(0, 10),
      resolutionAmount: simAmount,
      resolutionType: "settled",
      agentResolvedCountToDate: simCount,
    },
    ruleList
  );

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 rounded-xl border border-cyan-500/40 bg-[#0e1726]/95 px-4 py-3 text-sm text-cyan-300 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2">
          {toastMessage}
        </div>
      )}

      {/* Top Banner & Actions */}
      <div className="dash-clay rounded-2xl border border-white/10 bg-[#0d1527]/90 p-5 shadow-xl backdrop-blur-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sliders className="h-5 w-5 text-cyan-400" />
              <h3 className="text-base font-semibold text-white">
                Commercial Billing & Payout Rule Engine
              </h3>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Configure flexible commercial payout logic across banks, products, delinquency buckets, and agencies.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleRecalculate}
              disabled={isRecalculating}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRecalculating ? "animate-spin" : ""}`} />
              <span>{isRecalculating ? "Recalculating..." : "Recalculate Pending Cases"}</span>
            </button>
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-3.5 py-2 text-xs font-semibold text-black shadow-lg shadow-cyan-500/20 hover:brightness-110 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Add Commercial Rule</span>
            </button>
          </div>
        </div>
      </div>

      {/* Real-Time Rule Sandbox / Calculator */}
      <div className="dash-clay rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-950/20 via-[#0d1527]/90 to-[#0e1726]/90 p-5 shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-2 border-b border-white/10 pb-3">
          <Calculator className="h-4 w-4 text-cyan-400" />
          <h4 className="text-sm font-semibold text-white">Interactive Rule Sandbox & Calculator</h4>
          <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-medium text-cyan-300">
            Real-Time Evaluation
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-6 lg:grid-cols-12 items-end">
          <div className="md:col-span-2 lg:col-span-2">
            <label className="text-[11px] font-medium text-slate-300">Bank Partner</label>
            <select
              value={simBank}
              onChange={(e) => setSimBank(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
            >
              {filterOptions.banks.map((b) => (
                <option key={b} value={b} className="bg-slate-900">
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2 lg:col-span-2">
            <label className="text-[11px] font-medium text-slate-300">Loan Product</label>
            <select
              value={simProduct}
              onChange={(e) => setSimProduct(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
            >
              {filterOptions.products.map((p) => (
                <option key={p} value={p} className="bg-slate-900">
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2 lg:col-span-2">
            <label className="text-[11px] font-medium text-slate-300">Delinquency Bucket</label>
            <select
              value={simBucket}
              onChange={(e) => setSimBucket(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
            >
              {filterOptions.buckets.map((b) => (
                <option key={b} value={b} className="bg-slate-900">
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3 lg:col-span-2">
            <label className="text-[11px] font-medium text-slate-300">Recovery Agency</label>
            <select
              value={simAgency}
              onChange={(e) => setSimAgency(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
            >
              {filterOptions.agencies.map((a) => (
                <option key={a} value={a} className="bg-slate-900">
                  {a}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3 lg:col-span-2">
            <label className="text-[11px] font-medium text-slate-300">Resolved Amount (₹)</label>
            <input
              type="number"
              value={simAmount}
              onChange={(e) => setSimAmount(Number(e.target.value) || 0)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="md:col-span-2 lg:col-span-2">
            <label className="text-[11px] font-medium text-slate-300">Resolutions to Date</label>
            <input
              type="number"
              value={simCount}
              onChange={(e) => setSimCount(Number(e.target.value) || 0)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Live Calculation Output Card */}
        <div className="mt-4 rounded-xl border border-cyan-500/30 bg-black/40 p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 items-center">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Matched Rule</p>
              <p className="text-sm font-bold text-white truncate" title={simResult.matchedRule.name}>
                {simResult.matchedRule.name}
              </p>
              <p className="text-[11px] text-cyan-400 font-mono mt-0.5">{simResult.rateFormulaApplied}</p>
            </div>

            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Base Billing Fee</p>
              <p className="text-lg font-bold text-emerald-400 font-mono">
                ₹{simResult.calculatedBilling.toLocaleString("en-IN")}
              </p>
              <p className="text-[11px] text-slate-400">{simResult.effectiveRatePct}% effective yield</p>
            </div>

            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Taxes & Deductions</p>
              <p className="text-xs text-slate-300 font-mono">
                + GST (18%): ₹{simResult.gstAmount.toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-slate-400 font-mono">
                - TDS (2%): ₹{simResult.tdsAmount.toLocaleString("en-IN")}
              </p>
            </div>

            <div className="border-t border-white/10 pt-2 sm:border-t-0 sm:pt-0 sm:border-l sm:border-white/10 sm:pl-4">
              <p className="text-[10px] text-cyan-300 uppercase tracking-wider font-semibold">Net Agency Payable</p>
              <p className="text-xl font-extrabold text-cyan-400 font-mono">
                ₹{simResult.netPayable.toLocaleString("en-IN")}
              </p>
              <p className="text-[10px] text-slate-400">Ready for automated disbursement</p>
            </div>
          </div>
        </div>
      </div>

      {/* Rules Table */}
      <div className="dash-clay rounded-2xl border border-white/10 bg-[#0d1527]/90 p-5 shadow-xl backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h4 className="text-sm font-semibold text-white">Active Commercial Rules ({ruleList.length})</h4>
            <p className="text-xs text-slate-400">
              Evaluated by priority order. Specific bank/product rules take precedence over general defaults.
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/10 text-slate-400">
              <tr>
                <th className="py-2.5 px-3 font-medium">Priority</th>
                <th className="py-2.5 px-3 font-medium">Rule Name & Logic</th>
                <th className="py-2.5 px-3 font-medium">Rule Type</th>
                <th className="py-2.5 px-3 font-medium">Bank Scope</th>
                <th className="py-2.5 px-3 font-medium">Product Scope</th>
                <th className="py-2.5 px-3 font-medium">Rate / Formula</th>
                <th className="py-2.5 px-3 font-medium text-center">Status</th>
                <th className="py-2.5 px-3 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {ruleList.map((rule) => (
                <tr key={rule.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-cyan-400">
                    #{rule.priority}
                  </td>
                  <td className="py-3 px-3">
                    <p className="font-semibold text-white">{rule.name}</p>
                    <p className="text-[11px] text-slate-400 max-w-sm truncate">{rule.description}</p>
                  </td>
                  <td className="py-3 px-3">
                    <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-mono text-slate-300 capitalize">
                      {rule.ruleType.replace("_", " ")}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="rounded bg-blue-500/10 px-2 py-0.5 text-[11px] text-blue-300 border border-blue-500/20">
                      {rule.clientBank}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="rounded bg-purple-500/10 px-2 py-0.5 text-[11px] text-purple-300 border border-purple-500/20">
                      {rule.productType}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    {rule.ruleType === "percentage" && (
                      <p className="font-mono font-semibold text-emerald-400">{rule.percentageRate}% of collection</p>
                    )}
                    {rule.ruleType === "fixed_per_resolution" && (
                      <p className="font-mono font-semibold text-cyan-400">₹{rule.fixedAmount} / resolution</p>
                    )}
                    {rule.ruleType === "hybrid" && (
                      <p className="font-mono font-semibold text-amber-400">₹{rule.fixedAmount} + {rule.percentageRate}%</p>
                    )}
                    {rule.ruleType === "slab_amount" && (
                      <p className="font-mono text-cyan-300">Amount Slabs ({rule.slabAmountConfig?.length || 3} Tiers)</p>
                    )}
                    {rule.ruleType === "slab_count" && (
                      <p className="font-mono text-purple-300">Volume Slabs ({rule.slabCountConfig?.length || 3} Tiers)</p>
                    )}
                    {rule.ruleType === "bucket_tiered" && (
                      <p className="font-mono text-rose-300">{rule.percentageRate}% + Multipliers</p>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={() => handleToggleRule(rule.id, rule.isActive)}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-medium border transition-colors ${
                        rule.isActive
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                          : "border-slate-500/30 bg-slate-500/10 text-slate-400 hover:bg-slate-500/20"
                      }`}
                    >
                      {rule.isActive ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleOpenEditModal(rule)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                        title="Edit Commercial Rule"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete Rule"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="dash-clay max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/20 bg-[#0d1527] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <Sliders className="h-5 w-5 text-cyan-400" />
                <h3 className="text-base font-semibold text-white">
                  {editingRule ? "Edit Commercial Billing Rule" : "Create New Commercial Billing Rule"}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-slate-300">Rule Name *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. HDFC Auto Loans Standard Fee"
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300">Commercial Rule Type *</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as BillingRuleType)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="percentage" className="bg-slate-900">Collection % (Standard)</option>
                    <option value="fixed_per_resolution" className="bg-slate-900">Fixed Fee per Case</option>
                    <option value="hybrid" className="bg-slate-900">Hybrid (Fixed + %)</option>
                    <option value="slab_amount" className="bg-slate-900">Slab-Based on Collection Amount</option>
                    <option value="slab_count" className="bg-slate-900">Slab-Based on Resolution Volume</option>
                    <option value="bucket_tiered" className="bg-slate-900">Bucket-Weighted Multiplier</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300">Description / Contract Note</label>
                <input
                  type="text"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="e.g. Approved under Master Commercial Agreement 2026-Q1"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <label className="text-[11px] font-medium text-slate-300">Bank Scope</label>
                  <select
                    value={formBank}
                    onChange={(e) => setFormBank(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="All" className="bg-slate-900">All Banks</option>
                    {filterOptions.banks.map((b) => (
                      <option key={b} value={b} className="bg-slate-900">{b}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-300">Product Scope</label>
                  <select
                    value={formProduct}
                    onChange={(e) => setFormProduct(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="All" className="bg-slate-900">All Products</option>
                    {filterOptions.products.map((p) => (
                      <option key={p} value={p} className="bg-slate-900">{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-300">Bucket Scope</label>
                  <select
                    value={formBucket}
                    onChange={(e) => setFormBucket(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="All" className="bg-slate-900">All Buckets</option>
                    {filterOptions.buckets.map((b) => (
                      <option key={b} value={b} className="bg-slate-900">{b}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-300">Agency Scope</label>
                  <select
                    value={formAgency}
                    onChange={(e) => setFormAgency(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="All" className="bg-slate-900">All Agencies</option>
                    {filterOptions.agencies.map((a) => (
                      <option key={a} value={a} className="bg-slate-900">{a}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/30 p-4 space-y-3">
                {(formType === "percentage" || formType === "hybrid" || formType === "bucket_tiered") && (
                  <div>
                    <label className="text-xs font-medium text-slate-300">Percentage Rate (% of Collection)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formPctRate}
                      onChange={(e) => setFormPctRate(Number(e.target.value) || 0)}
                      className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                )}

                {(formType === "fixed_per_resolution" || formType === "hybrid") && (
                  <div>
                    <label className="text-xs font-medium text-slate-300">Fixed Fee per Resolution (₹)</label>
                    <input
                      type="number"
                      value={formFixedAmt}
                      onChange={(e) => setFormFixedAmt(Number(e.target.value) || 0)}
                      className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                )}

                {formType === "slab_amount" && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-300">Collection Amount Slabs</label>
                    {amountSlabs.map((slab, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400 w-14">Tier {i + 1}:</span>
                        <input
                          type="number"
                          placeholder="Min"
                          value={slab.min}
                          onChange={(e) => {
                            const updated = [...amountSlabs];
                            updated[i].min = Number(e.target.value);
                            setAmountSlabs(updated);
                          }}
                          className="w-24 rounded border border-white/10 bg-black/40 px-2 py-1 text-xs text-white font-mono"
                        />
                        <span className="text-slate-400">to</span>
                        <input
                          type="number"
                          placeholder="Max (0 for uncapped)"
                          value={slab.max}
                          onChange={(e) => {
                            const updated = [...amountSlabs];
                            updated[i].max = Number(e.target.value);
                            setAmountSlabs(updated);
                          }}
                          className="w-28 rounded border border-white/10 bg-black/40 px-2 py-1 text-xs text-white font-mono"
                        />
                        <span className="text-slate-400">@</span>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="Rate %"
                          value={slab.rate}
                          onChange={(e) => {
                            const updated = [...amountSlabs];
                            updated[i].rate = Number(e.target.value);
                            setAmountSlabs(updated);
                          }}
                          className="w-20 rounded border border-white/10 bg-black/40 px-2 py-1 text-xs text-white font-mono"
                        />
                        <span className="text-xs text-slate-400">%</span>
                      </div>
                    ))}
                  </div>
                )}

                {formType === "slab_count" && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-300">Resolution Volume Slabs (Count / Agent)</label>
                    {countSlabs.map((slab, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400 w-14">Tier {i + 1}:</span>
                        <input
                          type="number"
                          value={slab.min}
                          onChange={(e) => {
                            const updated = [...countSlabs];
                            updated[i].min = Number(e.target.value);
                            setCountSlabs(updated);
                          }}
                          className="w-20 rounded border border-white/10 bg-black/40 px-2 py-1 text-xs text-white font-mono"
                        />
                        <span className="text-slate-400">to</span>
                        <input
                          type="number"
                          value={slab.max}
                          onChange={(e) => {
                            const updated = [...countSlabs];
                            updated[i].max = Number(e.target.value);
                            setCountSlabs(updated);
                          }}
                          className="w-24 rounded border border-white/10 bg-black/40 px-2 py-1 text-xs text-white font-mono"
                        />
                        <span className="text-slate-400">cases → ₹</span>
                        <input
                          type="number"
                          value={slab.feePerCase}
                          onChange={(e) => {
                            const updated = [...countSlabs];
                            updated[i].feePerCase = Number(e.target.value);
                            setCountSlabs(updated);
                          }}
                          className="w-24 rounded border border-white/10 bg-black/40 px-2 py-1 text-xs text-white font-mono"
                        />
                        <span className="text-xs text-slate-400">/ case</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-xs font-medium text-slate-300">Evaluation Priority (1-100)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formPriority}
                    onChange={(e) => setFormPriority(Number(e.target.value) || 50)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="gstCheck"
                    checked={formApplyGst}
                    onChange={(e) => setFormApplyGst(e.target.checked)}
                    className="rounded border-white/20 bg-black text-cyan-500"
                  />
                  <label htmlFor="gstCheck" className="text-xs text-slate-300">
                    Apply GST (18%)
                  </label>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="tdsCheck"
                    checked={formApplyTds}
                    onChange={(e) => setFormApplyTds(e.target.checked)}
                    className="rounded border-white/20 bg-black text-cyan-500"
                  />
                  <label htmlFor="tdsCheck" className="text-xs text-slate-300">
                    Deduct TDS (2%)
                  </label>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs text-slate-300 hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2 text-xs font-semibold text-black shadow-lg shadow-cyan-500/20 hover:brightness-110 transition-all disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : editingRule ? "Update Rule" : "Create Rule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

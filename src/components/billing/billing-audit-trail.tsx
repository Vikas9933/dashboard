"use client";

import { useState } from "react";
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  ReceiptIndianRupee,
  ExternalLink,
  ChevronRight,
  Copy,
  Check,
} from "lucide-react";
import type {
  CaseBillingRecord,
  BillingApprovalStatus,
  BillingPaymentStatus,
} from "@/lib/services/billing-service";
import {
  updateBillingStatusAction,
  bulkApproveBillingAction,
} from "@/app/dashboard/billing/actions";

interface BillingAuditTrailProps {
  records: CaseBillingRecord[];
  activeRecord: CaseBillingRecord | null;
  onSelectRecord: (record: CaseBillingRecord | null) => void;
  onRefresh: () => void;
}

export function BillingAuditTrail({
  records,
  activeRecord,
  onSelectRecord,
  onRefresh,
}: BillingAuditTrailProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkApproving, setIsBulkApproving] = useState(false);
  const [actionNotes, setActionNotes] = useState("");
  const [paymentUtr, setPaymentUtr] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const filtered = records.filter((r) => {
    if (statusFilter !== "all" && r.approvalStatus !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const match =
        r.loanNumber.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        r.agentName.toLowerCase().includes(q) ||
        r.agencyName.toLowerCase().includes(q) ||
        r.clientBank.toLowerCase().includes(q) ||
        r.matchedRuleName.toLowerCase().includes(q) ||
        (r.paymentReference && r.paymentReference.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const allPendingFiltered = filtered.filter((r) => r.approvalStatus === "pending_approval");

  function handleSelectAllPending() {
    if (selectedIds.length === allPendingFiltered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allPendingFiltered.map((r) => r.id));
    }
  }

  async function handleBulkApprove() {
    if (selectedIds.length === 0) return;
    setIsBulkApproving(true);
    const res = await bulkApproveBillingAction(selectedIds, "Finance Audit Approver");
    setIsBulkApproving(false);
    if (res.success) {
      setSelectedIds([]);
      onRefresh();
    }
  }

  async function handleUpdateStatus(
    approvalStatus: BillingApprovalStatus,
    paymentStatus?: BillingPaymentStatus
  ) {
    if (!activeRecord) return;
    setIsUpdating(true);
    const res = await updateBillingStatusAction(
      activeRecord.id,
      approvalStatus,
      paymentStatus,
      paymentUtr.trim() || undefined,
      actionNotes.trim() || undefined,
      "Audit & Compliance Manager"
    );
    setIsUpdating(false);
    if (res.success && res.record) {
      onSelectRecord(res.record);
      setActionNotes("");
      setPaymentUtr("");
      onRefresh();
    }
  }

  return (
    <div className="space-y-6">
      <div className="dash-clay rounded-2xl border border-white/10 bg-[#0d1527]/90 p-5 shadow-xl backdrop-blur-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-cyan-400" />
              <h3 className="text-base font-semibold text-white">
                Forensic Billing Traceability & Audit Trail
              </h3>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              End-to-end chain of custody: Case → Agent → TL → Agency → Resolution → Collection → Billing Rule → Calculated Billing → Approved Billing → Payment Status.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {selectedIds.length > 0 && (
              <button
                onClick={handleBulkApprove}
                disabled={isBulkApproving}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg shadow-emerald-500/20 hover:brightness-110 transition-all disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>
                  {isBulkApproving ? "Approving..." : `Bulk Approve (${selectedIds.length})`}
                </span>
              </button>
            )}

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value="all" className="bg-slate-900">All Statuses</option>
                <option value="pending_approval" className="bg-slate-900">Pending Approval</option>
                <option value="approved" className="bg-slate-900">Approved</option>
                <option value="held" className="bg-slate-900">Compliance Held</option>
                <option value="disputed" className="bg-slate-900">Disputed</option>
              </select>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Loan #, borrower, UTR..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-56 rounded-lg border border-white/10 bg-black/40 pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3 text-[11px] overflow-x-auto">
          <span className="font-semibold text-slate-300 shrink-0 mr-2">Audit Chain:</span>
          <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
            <span className="rounded bg-blue-500/10 text-blue-400 px-1.5 py-0.5">1. Case Record</span>
            <ChevronRight className="h-3 w-3 text-slate-600" />
            <span className="rounded bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5">2. Agent & TL</span>
            <ChevronRight className="h-3 w-3 text-slate-600" />
            <span className="rounded bg-purple-500/10 text-purple-400 px-1.5 py-0.5">3. Agency</span>
            <ChevronRight className="h-3 w-3 text-slate-600" />
            <span className="rounded bg-teal-500/10 text-teal-400 px-1.5 py-0.5">4. Resolution Event</span>
            <ChevronRight className="h-3 w-3 text-slate-600" />
            <span className="rounded bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5">5. Collection Amount</span>
            <ChevronRight className="h-3 w-3 text-slate-600" />
            <span className="rounded bg-amber-500/10 text-amber-400 px-1.5 py-0.5">6. Billing Rule</span>
            <ChevronRight className="h-3 w-3 text-slate-600" />
            <span className="rounded bg-cyan-500/10 text-cyan-400 px-1.5 py-0.5">7. Calculated Fee</span>
            <ChevronRight className="h-3 w-3 text-slate-600" />
            <span className="rounded bg-blue-500/10 text-blue-300 px-1.5 py-0.5">8. Approved Billing</span>
            <ChevronRight className="h-3 w-3 text-slate-600" />
            <span className="rounded bg-green-500/10 text-green-400 px-1.5 py-0.5">9. Settlement UTR</span>
          </div>
        </div>
      </div>

      <div className="dash-clay rounded-2xl border border-white/10 bg-[#0d1527]/90 p-5 shadow-xl backdrop-blur-xl overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-white/10 text-slate-400">
            <tr>
              <th className="py-2.5 px-3">
                <input
                  type="checkbox"
                  checked={
                    allPendingFiltered.length > 0 &&
                    selectedIds.length === allPendingFiltered.length
                  }
                  onChange={handleSelectAllPending}
                  className="rounded border-white/20 bg-black text-cyan-500"
                />
              </th>
              <th className="py-2.5 px-3 font-medium">Case & Loan</th>
              <th className="py-2.5 px-3 font-medium">Roster Chain (Agent → TL → Agency)</th>
              <th className="py-2.5 px-3 font-medium">Resolution Event</th>
              <th className="py-2.5 px-3 font-medium text-right">Collection (₹)</th>
              <th className="py-2.5 px-3 font-medium">Matched Commercial Rule</th>
              <th className="py-2.5 px-3 font-medium text-right">Calculated Billing</th>
              <th className="py-2.5 px-3 font-medium text-right">Approved Billing</th>
              <th className="py-2.5 px-3 font-medium text-center">Approval Status</th>
              <th className="py-2.5 px-3 font-medium text-center">Payment Status</th>
              <th className="py-2.5 px-3 font-medium text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-slate-300">
            {filtered.map((record) => {
              const isSelected = selectedIds.includes(record.id);
              return (
                <tr
                  key={record.id}
                  className={`hover:bg-white/[0.03] transition-colors ${
                    isSelected ? "bg-cyan-500/[0.05]" : ""
                  }`}
                >
                  <td className="py-3 px-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={record.approvalStatus === "approved"}
                      onChange={() => {
                        if (isSelected) {
                          setSelectedIds((prev) => prev.filter((id) => id !== record.id));
                        } else {
                          setSelectedIds((prev) => [...prev, record.id]);
                        }
                      }}
                      className="rounded border-white/20 bg-black text-cyan-500 disabled:opacity-30"
                    />
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1.5">
                      <p className="font-mono font-semibold text-white">{record.loanNumber}</p>
                      <button
                        onClick={() => copyToClipboard(record.loanNumber, record.id)}
                        className="text-slate-500 hover:text-slate-300"
                        title="Copy Loan Number"
                      >
                        {copiedId === record.id ? (
                          <Check className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-300">{record.customerName}</p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      {record.clientBank} • {record.productType}
                    </p>
                  </td>
                  <td className="py-3 px-3">
                    <p className="font-medium text-white">{record.agentName}</p>
                    <p className="text-[10px] text-slate-400">TL: {record.teamLeaderName}</p>
                    <p className="text-[10px] text-cyan-400/80">{record.agencyName}</p>
                  </td>
                  <td className="py-3 px-3">
                    <p className="text-slate-300">{record.resolutionDate}</p>
                    <span className="rounded bg-white/5 border border-white/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-slate-400">
                      {record.resolutionType.replace("_", " ")}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <p className="font-mono font-bold text-emerald-400">
                      ₹{record.resolutionAmount.toLocaleString("en-IN")}
                    </p>
                  </td>
                  <td className="py-3 px-3">
                    <p className="text-white text-xs truncate max-w-xs">{record.matchedRuleName}</p>
                    <p className="text-[10px] text-cyan-400 font-mono">{record.rateFormulaApplied}</p>
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-white">
                    ₹{record.calculatedBilling.toLocaleString("en-IN")}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-cyan-300">
                    ₹{record.approvedBilling.toLocaleString("en-IN")}
                  </td>
                  <td className="py-3 px-3 text-center">
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
                      {record.approvalStatus.replace("_", " ")}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border ${
                        record.paymentStatus === "paid"
                          ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-400"
                          : record.paymentStatus === "processing"
                          ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-400"
                          : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                      }`}
                    >
                      {record.paymentStatus}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={() => onSelectRecord(record)}
                      className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-medium text-cyan-300 hover:bg-cyan-500/20 transition-colors inline-flex items-center gap-1"
                    >
                      <span>Trace</span>
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {activeRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in">
          <div className="dash-clay max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/20 bg-[#0d1527] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-cyan-400">
                  Forensic Traceability Record #{activeRecord.id}
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  Loan Account: {activeRecord.loanNumber}
                </h3>
              </div>
              <button
                onClick={() => onSelectRecord(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 rounded-xl border border-cyan-500/30 bg-black/40 p-4">
              <p className="text-xs font-semibold text-cyan-300 uppercase tracking-wider mb-3">
                Full Chain of Custody & Traceability
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
                  <p className="text-[10px] text-slate-400">Borrower</p>
                  <p className="text-xs font-bold text-white mt-0.5">{activeRecord.customerName}</p>
                  <p className="text-[10px] text-slate-500">{activeRecord.bucket}</p>
                </div>
                <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
                  <p className="text-[10px] text-slate-400">Working Agent</p>
                  <p className="text-xs font-bold text-white mt-0.5">{activeRecord.agentName}</p>
                  <p className="text-[10px] text-slate-500">TL: {activeRecord.teamLeaderName}</p>
                </div>
                <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
                  <p className="text-[10px] text-slate-400">Recovery Agency</p>
                  <p className="text-xs font-bold text-white mt-0.5">{activeRecord.agencyName}</p>
                  <p className="text-[10px] text-slate-500">{activeRecord.clientBank}</p>
                </div>
                <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
                  <p className="text-[10px] text-slate-400">Resolution Event</p>
                  <p className="text-xs font-bold text-emerald-400 mt-0.5">
                    ₹{activeRecord.resolutionAmount.toLocaleString("en-IN")}
                  </p>
                  <p className="text-[10px] text-slate-500">{activeRecord.resolutionDate}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4 space-y-3">
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                Commercial Rule & Financial Calculation
              </h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-[10px] text-slate-400">Matched Commercial Rule</p>
                  <p className="text-xs font-semibold text-white">{activeRecord.matchedRuleName}</p>
                  <p className="text-[10px] text-cyan-400 font-mono mt-0.5">
                    {activeRecord.rateFormulaApplied}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] text-slate-400">Base Calculated Fee</p>
                  <p className="text-base font-bold text-emerald-400 font-mono">
                    ₹{activeRecord.calculatedBilling.toLocaleString("en-IN")}
                  </p>
                  <p className="text-[10px] text-slate-500">{activeRecord.effectiveRatePct}% yield</p>
                </div>

                <div>
                  <p className="text-[10px] text-slate-400">Approved Commercial Fee</p>
                  <p className="text-base font-bold text-cyan-400 font-mono">
                    ₹{activeRecord.approvedBilling.toLocaleString("en-IN")}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {activeRecord.approvedBy ? `By: ${activeRecord.approvedBy}` : "Pending Approval"}
                  </p>
                </div>
              </div>

              <div className="border-t border-white/5 pt-2 grid grid-cols-3 gap-2 text-xs font-mono">
                <div>
                  <span className="text-slate-400 text-[10px]">GST (18%):</span>
                  <p className="text-slate-200">₹{activeRecord.gstAmount.toLocaleString("en-IN")}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">TDS Withholding (2%):</span>
                  <p className="text-slate-200">- ₹{activeRecord.tdsAmount.toLocaleString("en-IN")}</p>
                </div>
                <div>
                  <span className="text-cyan-400 text-[10px]">Net Payable to Agency:</span>
                  <p className="text-cyan-300 font-bold">₹{activeRecord.netPayable.toLocaleString("en-IN")}</p>
                </div>
              </div>

              {activeRecord.paymentReference && (
                <div className="border-t border-white/5 pt-2 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Payment Reference / UTR:</span>
                  <span className="font-mono text-cyan-300 font-semibold">{activeRecord.paymentReference}</span>
                </div>
              )}
            </div>

            <div className="mt-4 space-y-2">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Traceability Audit Log ({activeRecord.auditLogs.length} events)
              </h4>
              <div className="divide-y divide-white/5 rounded-xl border border-white/10 bg-black/20 p-3">
                {activeRecord.auditLogs.map((log, idx) => (
                  <div key={idx} className="py-2 first:pt-0 last:pb-0 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-cyan-300 font-mono text-[11px]">
                        {log.action}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{log.timestamp}</span>
                    </div>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      Actor: <span className="text-slate-200">{log.performedBy}</span>
                    </p>
                    {log.details && <p className="text-slate-300 mt-1 text-[11px]">{log.details}</p>}
                    {log.reason && (
                      <p className="text-amber-400/90 text-[10px] italic mt-0.5">Reason: {log.reason}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <h4 className="text-xs font-semibold text-white">Client / Audit Actions</h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  placeholder="Action Notes / Compliance reason..."
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  className="rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Bank UTR / Transaction Ref..."
                  value={paymentUtr}
                  onChange={(e) => setPaymentUtr(e.target.value)}
                  className="rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={isUpdating || activeRecord.approvalStatus === "approved"}
                  onClick={() => handleUpdateStatus("approved")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-40 transition-colors"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Approve Billing</span>
                </button>

                <button
                  type="button"
                  disabled={isUpdating || activeRecord.paymentStatus === "paid"}
                  onClick={() => handleUpdateStatus("approved", "paid")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-400 hover:bg-cyan-500/20 disabled:opacity-40 transition-colors"
                >
                  <ReceiptIndianRupee className="h-3.5 w-3.5" />
                  <span>Disburse / Mark Paid</span>
                </button>

                <button
                  type="button"
                  disabled={isUpdating || activeRecord.approvalStatus === "held"}
                  onClick={() => handleUpdateStatus("held")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 disabled:opacity-40 transition-colors"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Place on Compliance Hold</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

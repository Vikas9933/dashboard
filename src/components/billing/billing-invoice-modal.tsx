"use client";

import { useState } from "react";
import { Printer, Building2, CheckCircle2, X } from "lucide-react";
import type { BillingReportsData } from "@/lib/services/billing-service";

interface BillingInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  reports: BillingReportsData;
}

export function BillingInvoiceModal({
  isOpen,
  onClose,
  reports,
}: BillingInvoiceModalProps) {
  const [selectedAgency, setSelectedAgency] = useState(
    reports.agencyWise[0]?.agency || "Apex Recovery Services"
  );
  const [selectedBank, setSelectedBank] = useState(
    reports.bankWise[0]?.bank || "HDFC Bank"
  );

  if (!isOpen) return null;

  const agencyData = reports.agencyWise.find((a) => a.agency === selectedAgency);
  const grossBilling = agencyData?.generatedBilling || 0;
  const gst = Math.round(grossBilling * 0.18);
  const tds = Math.round(grossBilling * 0.02);
  const net = grossBilling + gst - tds;

  const invoiceNumber = `INV-REC-2026-${Math.abs(selectedAgency.length * 1047 + 500)}`;
  const invoiceDate = new Date().toISOString().slice(0, 10);
  const dueDate = new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10);

  function handlePrint() {
    window.print();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in">
      <div className="dash-clay max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/20 bg-[#0d1527] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-cyan-400" />
            <h3 className="text-base font-semibold text-white">
              Commercial Billing Statement & Tax Invoice
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition-colors"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Invoice</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 rounded-xl border border-white/10 bg-black/30 p-3 text-xs">
          <div>
            <label className="text-[11px] text-slate-400">Bill From (Agency Partner):</label>
            <select
              value={selectedAgency}
              onChange={(e) => setSelectedAgency(e.target.value)}
              className="mt-1 w-full rounded border border-white/10 bg-slate-900 px-2 py-1.5 text-white"
            >
              {reports.agencyWise.map((a) => (
                <option key={a.agency} value={a.agency}>
                  {a.agency}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] text-slate-400">Bill To (Bank Partner):</label>
            <select
              value={selectedBank}
              onChange={(e) => setSelectedBank(e.target.value)}
              className="mt-1 w-full rounded border border-white/10 bg-slate-900 px-2 py-1.5 text-white"
            >
              {reports.bankWise.map((b) => (
                <option key={b.bank} value={b.bank}>
                  {b.bank}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-white/15 bg-white text-slate-900 p-6 shadow-2xl">
          <div className="flex items-start justify-between border-b border-slate-200 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 font-bold text-white text-sm">
                  CR
                </span>
                <div>
                  <h4 className="text-base font-bold text-slate-900">{selectedAgency}</h4>
                  <p className="text-[11px] text-slate-500">Authorized Collections & Debt Resolution Partner</p>
                </div>
              </div>
              <p className="mt-2 text-[10px] text-slate-600">
                GSTIN: 27AABCA1234F1Z8 • PAN: AABCA1234F<br />
                Address: Level 4, Financial Towers, BKC, Mumbai - 400051
              </p>
            </div>

            <div className="text-right">
              <span className="rounded bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 uppercase tracking-wider">
                Tax Invoice / Payout Claim
              </span>
              <p className="mt-2 text-xs font-mono font-bold text-slate-800">{invoiceNumber}</p>
              <p className="text-[10px] text-slate-500">Invoice Date: {invoiceDate}</p>
              <p className="text-[10px] text-slate-500">Due Date: {dueDate}</p>
            </div>
          </div>

          <div className="mt-4 border-b border-slate-200 pb-4">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Billed To Client:</p>
            <p className="text-sm font-bold text-slate-900 mt-0.5">{selectedBank}</p>
            <p className="text-[11px] text-slate-600">Retail Assets & Delinquency Management Division</p>
            <p className="text-[10px] text-slate-500">Subject: Resolution-Based Commercial Fee Reimbursement</p>
          </div>

          <div className="mt-4">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-300 text-slate-500">
                <tr>
                  <th className="py-2">Portfolio / Description</th>
                  <th className="py-2 text-center">Resolutions</th>
                  <th className="py-2 text-right">Gross Recovery (₹)</th>
                  <th className="py-2 text-right">Applicable Rate</th>
                  <th className="py-2 text-right">Generated Billing (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {reports.productWise.slice(0, 4).map((p, idx) => {
                  const share = (agencyData?.generatedBilling || 0) / 4;
                  return (
                    <tr key={idx}>
                      <td className="py-2.5 font-medium text-slate-900">
                        {p.product} Resolution Fees
                        <p className="text-[10px] text-slate-400">Delinquency recovery & customer settlements</p>
                      </td>
                      <td className="py-2.5 text-center font-mono">{Math.round(p.resolutionCount * 0.25)}</td>
                      <td className="py-2.5 text-right font-mono">
                        ₹{Math.round(p.collectionAmount * 0.25).toLocaleString("en-IN")}
                      </td>
                      <td className="py-2.5 text-right font-mono">{p.effectiveRate}%</td>
                      <td className="py-2.5 text-right font-mono font-semibold text-slate-900">
                        ₹{Math.round(share).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-5 border-t border-slate-200 pt-3">
            <div className="flex justify-end">
              <div className="w-72 space-y-1.5 text-xs font-mono">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal (Base Billing):</span>
                  <span>₹{grossBilling.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>+ IGST / CGST+SGST (18%):</span>
                  <span>₹{gst.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-slate-600 border-b border-slate-200 pb-1.5">
                  <span>- TDS u/s 194H (2%):</span>
                  <span>-₹{tds.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-slate-900 pt-1">
                  <span>Net Amount Payable:</span>
                  <span className="text-blue-700">₹{net.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-slate-200 pt-4 flex items-center justify-between text-xs text-slate-500">
            <div>
              <p className="font-semibold text-slate-700">Direct Settlement CMS Account:</p>
              <p className="text-[10px] font-mono mt-0.5">
                Bank: ICICI Bank BKC • A/C: 000405001234 • IFSC: ICIC0000004
              </p>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center gap-1 rounded-full border border-emerald-600/30 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                <CheckCircle2 className="h-3 w-3" />
                Digitally Verified & Approved
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Authorized Signatory - Operations</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

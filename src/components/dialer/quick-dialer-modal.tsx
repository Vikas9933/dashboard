"use client";

import { useState } from "react";
import {
  X,
  PhoneCall,
  Save,
} from "lucide-react";
import type { DialerCaseRecord, DialerDisposition } from "@/lib/services/dialer-service";
import { formatCurrency } from "@/lib/format";

interface QuickDialerModalProps {
  caseRecord: DialerCaseRecord | null;
  onClose: () => void;
  onCallLogged: (input: {
    accountId: string;
    disposition: DialerDisposition;
    durationSeconds: number;
    ptpAmount?: number;
    ptpDate?: string;
    notes?: string;
  }) => void;
}

export function QuickDialerModal({
  caseRecord,
  onClose,
  onCallLogged,
}: QuickDialerModalProps) {
  const [disposition, setDisposition] = useState<DialerDisposition>("RPC_PTP");
  const [durationMins, setDurationMins] = useState("2");
  const [durationSecs, setDurationSecs] = useState("30");
  const [ptpAmount, setPtpAmount] = useState(() =>
    caseRecord ? Math.round((caseRecord.outstandingAmount * 0.4) / 500) * 500 : 15000
  );
  const [ptpDate, setPtpDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState(() =>
    caseRecord
      ? `Spoke directly with ${caseRecord.customerName}. Customer agreed to clear overdue amount and committed to PTP.`
      : "Call logged."
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!caseRecord) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!caseRecord) return;
    setIsSubmitting(true);

    const totalSeconds = (parseInt(durationMins, 10) || 0) * 60 + (parseInt(durationSecs, 10) || 0);

    onCallLogged({
      accountId: caseRecord.accountId,
      disposition,
      durationSeconds: Math.max(10, totalSeconds),
      ptpAmount: disposition === "RPC_PTP" ? ptpAmount : undefined,
      ptpDate: disposition === "RPC_PTP" ? ptpDate : undefined,
      notes,
    });

    setIsSubmitting(false);
    onClose();
  }

  const isConnected = ![
    "BUSY",
    "SWITCHED_OFF",
    "RINGING_NO_ANSWER",
    "NOT_REACHABLE",
    "CALL_DROPPED",
  ].includes(disposition);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="dash-clay relative z-10 w-full max-w-lg rounded-2xl border border-white/10 bg-[#0B1120] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-5 bg-gradient-to-r from-blue-900/30 to-transparent">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00F2FE]/20 text-[#00F2FE]">
              <PhoneCall className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Dialer Quick Call Simulator</h3>
              <p className="text-xs text-slate-400">
                Log live telephony disposition for {caseRecord.customerName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Borrower Case Preview Card */}
        <div className="bg-black/40 border-b border-white/5 p-4 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-white text-sm">{caseRecord.customerName}</span>
              <span className="text-slate-400 block font-mono text-[11px]">
                {caseRecord.loanNumber} • {caseRecord.phoneNumber}
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block text-[10px]">Outstanding</span>
              <span className="font-mono font-bold text-[#00F2FE] text-sm">
                {formatCurrency(caseRecord.outstandingAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Disposition Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Call Disposition Outcome
            </label>
            <select
              value={disposition}
              onChange={(e) => {
                const val = e.target.value as DialerDisposition;
                setDisposition(val);
                if (val === "RPC_PTP") {
                  setNotes(`Borrower confirmed payment commitment of ₹${ptpAmount.toLocaleString("en-IN")}.`);
                } else if (val === "RPC_CALL_BACK") {
                  setNotes("Borrower requested callback in the evening. Follow-up scheduled.");
                } else if (val === "BUSY") {
                  setNotes("Line was busy. Automated retry scheduled.");
                } else {
                  setNotes(`Call disposition logged as ${val.replace(/_/g, " ")}.`);
                }
              }}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white focus:border-[#00F2FE]/50 focus:outline-none"
            >
              <optgroup label="Connected - Right Party Contact (RPC)">
                <option value="RPC_PTP">RPC - PTP (Promise to Pay)</option>
                <option value="RPC_CALL_BACK">RPC - Callback Requested</option>
                <option value="RPC_SETTLEMENT_REQUEST">RPC - Settlement Inquiry</option>
                <option value="RPC_DISPUTE">RPC - Statement / Loan Dispute</option>
                <option value="RPC_REFUSAL">RPC - Refusal to Pay</option>
              </optgroup>
              <optgroup label="Connected - Non-RPC">
                <option value="THIRD_PARTY_CONTACT">Third-Party Contact (Family/Spouse)</option>
                <option value="WRONG_NUMBER">Wrong Number / Not Customer</option>
              </optgroup>
              <optgroup label="Not Connected">
                <option value="BUSY">Busy Line</option>
                <option value="SWITCHED_OFF">Switched Off</option>
                <option value="RINGING_NO_ANSWER">Ringing No Answer</option>
                <option value="NOT_REACHABLE">Out of Coverage</option>
                <option value="CALL_DROPPED">Call Dropped</option>
              </optgroup>
            </select>
          </div>

          {/* Call Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Talk Duration (Mins)
              </label>
              <input
                type="number"
                min="0"
                max="60"
                value={durationMins}
                onChange={(e) => setDurationMins(e.target.value)}
                disabled={!isConnected}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white focus:border-[#00F2FE]/50 focus:outline-none disabled:opacity-40"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Seconds
              </label>
              <input
                type="number"
                min="0"
                max="59"
                value={durationSecs}
                onChange={(e) => setDurationSecs(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white focus:border-[#00F2FE]/50 focus:outline-none"
              />
            </div>
          </div>

          {/* Conditional PTP Fields */}
          {disposition === "RPC_PTP" && (
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3">
              <div>
                <label className="block text-[11px] font-semibold text-amber-300 mb-1">
                  PTP Amount (₹)
                </label>
                <input
                  type="number"
                  min="500"
                  step="500"
                  value={ptpAmount}
                  onChange={(e) => setPtpAmount(Number(e.target.value))}
                  className="w-full rounded-lg border border-amber-500/30 bg-black/40 px-3 py-1.5 text-xs text-white font-mono focus:border-amber-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-amber-300 mb-1">
                  PTP Commitment Date
                </label>
                <input
                  type="date"
                  value={ptpDate}
                  onChange={(e) => setPtpDate(e.target.value)}
                  className="w-full rounded-lg border border-amber-500/30 bg-black/40 px-3 py-1.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Agent Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Call Notes &amp; Borrower Summary
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter remarks..."
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-[#00F2FE]/50 focus:outline-none leading-relaxed"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#00F2FE] to-cyan-500 px-4 py-2 text-xs font-bold text-[#0B1120] hover:opacity-90 shadow-lg shadow-[#00F2FE]/20 transition"
            >
              <Save className="h-4 w-4" />
              <span>Log Call &amp; Update Telemetry</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

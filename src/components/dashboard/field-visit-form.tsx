"use client";

import { useState, useTransition } from "react";
import { Loader2, MapPinPlus } from "lucide-react";
import { createFieldVisit } from "@/app/dashboard/actions";
import type { AccountOption } from "@/lib/types";

interface FieldVisitFormProps {
  accounts: AccountOption[];
}

const inputClass = "dash-input";

export function FieldVisitForm({ accounts }: FieldVisitFormProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [promiseToPay, setPromiseToPay] = useState(false);
  const [isPending, startTransition] = useTransition();

  const today = new Date().toISOString().slice(0, 10);

  function handleSubmit(formData: FormData) {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await createFieldVisit(formData);
      if (result.error) setError(result.error);
      else if (result.success) {
        setMessage(result.success);
        setPromiseToPay(false);
      }
    });
  }

  return (
    <div className="border-b border-white/5 bg-white/[0.02] px-5 py-4">
      <div className="mb-3 flex items-center gap-2">
        <MapPinPlus className="h-4 w-4 text-[#00F2FE]" />
        <h3 className="text-sm font-semibold text-white">Record Field Visit</h3>
      </div>

      {(message || error) && (
        <div
          className={`mb-3 rounded-xl px-3 py-2 text-sm ${
            error
              ? "border border-rose-500/30 bg-rose-500/10 text-rose-300"
              : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          }`}
        >
          {error ?? message}
        </div>
      )}

      <form action={handleSubmit} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="md:col-span-2">
          <label htmlFor="accountId" className="mb-1 block text-xs font-medium text-slate-400">
            Account (Loan Number)
          </label>
          <select id="accountId" name="accountId" required className={inputClass}>
            <option value="">Select account</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.loanNumber} — {account.customerName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="visitDate" className="mb-1 block text-xs font-medium text-slate-400">
            Visit Date
          </label>
          <input
            id="visitDate"
            name="visitDate"
            type="date"
            required
            defaultValue={today}
            className={inputClass}
          />
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              name="customerMet"
              className="rounded border-white/20 bg-white/5 text-[#00F2FE]"
            />
            Customer Met
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              name="promiseToPay"
              checked={promiseToPay}
              onChange={(e) => setPromiseToPay(e.target.checked)}
              className="rounded border-white/20 bg-white/5 text-[#00F2FE]"
            />
            Promise to Pay
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              name="settlementInterest"
              className="rounded border-white/20 bg-white/5 text-[#00F2FE]"
            />
            Settlement Interest
          </label>
        </div>

        {promiseToPay && (
          <div>
            <label htmlFor="ptpAmount" className="mb-1 block text-xs font-medium text-slate-400">
              PTP Amount
            </label>
            <input
              id="ptpAmount"
              name="ptpAmount"
              type="number"
              min={1}
              step={0.01}
              required
              placeholder="Amount"
              className={inputClass}
            />
          </div>
        )}

        <div className="md:col-span-2 xl:col-span-3">
          <label htmlFor="remarks" className="mb-1 block text-xs font-medium text-slate-400">
            Remarks
          </label>
          <input
            id="remarks"
            name="remarks"
            type="text"
            placeholder="Visit notes..."
            className={inputClass}
          />
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={isPending}
            className="dash-btn-primary flex w-full items-center justify-center gap-2 disabled:opacity-50"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save Visit
          </button>
        </div>
      </form>
    </div>
  );
}

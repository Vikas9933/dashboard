"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatBucket, formatCurrency } from "@/lib/format";
import type { CustomerResult } from "@/lib/types";

interface CustomerSearchProps {
  results: CustomerResult[];
}

export function CustomerSearch({ results }: CustomerSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const q = (form.get("q") as string)?.trim() ?? "";
    const params = new URLSearchParams(searchParams.toString());
    if (q) params.set("q", q);
    else params.delete("q");
    router.push(`/dashboard?${params.toString()}#search`);
  }

  return (
    <Card variant="glass" id="search">
      <CardHeader variant="glass">
        <h2 className="text-base font-semibold text-white">Customer Search</h2>
        <p className="mt-0.5 text-sm text-slate-400">
          Search by customer name, mobile number, or loan number
        </p>
      </CardHeader>
      <CardBody className="space-y-4">
        <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              name="q"
              type="search"
              defaultValue={query}
              placeholder="Enter name, mobile, or loan number..."
              className="dash-input py-2.5 pl-10"
            />
          </div>
          <button type="submit" className="dash-btn-primary shrink-0 px-5 py-2.5">
            Search
          </button>
        </form>

        {query && (
          <div className="overflow-x-auto rounded-xl border border-white/5">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02] text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Mobile</th>
                  <th className="px-4 py-3">Loan No.</th>
                  <th className="px-4 py-3">Outstanding</th>
                  <th className="px-4 py-3">Bucket</th>
                  <th className="px-4 py-3">Last Payment</th>
                  <th className="px-4 py-3">Last Follow-up</th>
                  <th className="px-4 py-3">Remark</th>
                </tr>
              </thead>
              <tbody>
                {results.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                      No customers found for &quot;{query}&quot;
                    </td>
                  </tr>
                ) : (
                  results.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-white/[0.03] transition hover:bg-[#00F2FE]/5"
                    >
                      <td className="px-4 py-3 font-medium text-white">{c.customerName}</td>
                      <td className="px-4 py-3 text-slate-400">{c.mobileNumber}</td>
                      <td className="px-4 py-3 text-slate-400">{c.loanNumber}</td>
                      <td className="px-4 py-3 font-medium text-[#00F2FE]">
                        {formatCurrency(c.outstandingAmount)}
                      </td>
                      <td className="px-4 py-3 text-slate-300">{formatBucket(c.bucket)}</td>
                      <td className="px-4 py-3 text-slate-500">{c.lastPaymentDate ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {c.lastFollowUp ? new Date(c.lastFollowUp).toLocaleDateString("en-IN") : "—"}
                      </td>
                      <td className="max-w-[160px] truncate px-4 py-3 text-slate-500">
                        {c.latestRemark ?? "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

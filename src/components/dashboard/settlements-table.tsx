"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import type { SettlementRow } from "@/lib/types";

interface SettlementsTableProps {
  settlements: SettlementRow[];
  canApprove?: boolean;
}

const statusStyles: Record<string, string> = {
  approved: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  pending: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  rejected: "border-rose-500/30 bg-rose-500/10 text-rose-400",
};

export function SettlementsTable({ settlements, canApprove = false }: SettlementsTableProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleAction(settlementId: string, action: "approve" | "reject") {
    setLoadingId(settlementId);
    try {
      const response = await fetch("/api/admin/settlements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settlementId, action }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        alert(body.error ?? "Action failed.");
        return;
      }
      router.refresh();
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <Card variant="glass" id="settlements">
      <CardHeader variant="glass">
        <h2 className="text-base font-semibold text-white">Settlement Tracker</h2>
        <p className="mt-0.5 text-sm text-slate-400">
          Settlement requests — Approved / Pending / Rejected
        </p>
      </CardHeader>
      <CardBody className="overflow-x-auto p-0">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02] text-xs uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Loan No.</th>
              <th className="px-4 py-3 font-medium">Outstanding</th>
              <th className="px-4 py-3 font-medium">Settlement Amt</th>
              <th className="px-4 py-3 font-medium">Request Date</th>
              <th className="px-4 py-3 font-medium">Status</th>
              {canApprove && <th className="px-4 py-3 font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {settlements.length === 0 ? (
              <tr>
                <td colSpan={canApprove ? 7 : 6} className="px-5 py-8 text-center text-slate-500">
                  No settlement requests
                </td>
              </tr>
            ) : (
              settlements.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-white/[0.03] transition hover:bg-[#00F2FE]/5"
                >
                  <td className="px-4 py-3.5 font-medium text-white">{s.customerName}</td>
                  <td className="px-4 py-3.5 text-slate-400">{s.loanNumber}</td>
                  <td className="px-4 py-3.5 text-slate-400">
                    {formatCurrency(s.outstandingAmount)}
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-[#00F2FE]">
                    {formatCurrency(s.settlementAmount)}
                  </td>
                  <td className="px-4 py-3.5 text-slate-400">{s.requestDate}</td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${statusStyles[s.status]}`}
                    >
                      {s.status}
                    </span>
                  </td>
                  {canApprove && (
                    <td className="px-4 py-3.5">
                      {s.status === "pending" ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={loadingId === s.id}
                            onClick={() => handleAction(s.id, "approve")}
                            className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-60"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={loadingId === s.id}
                            onClick={() => handleAction(s.id, "reject")}
                            className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-400 hover:bg-rose-500/20 disabled:opacity-60"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">—</span>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </CardBody>
    </Card>
  );
}

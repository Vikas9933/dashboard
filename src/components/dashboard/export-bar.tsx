"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";

export function ExportBar() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function downloadReport(format: "xlsx" | "csv" | "pdf") {
    setLoading(format);
    setError(null);

    try {
      const params = new URLSearchParams(searchParams.toString());
      params.set("format", format);

      const response = await fetch(`/api/export?${params.toString()}`);
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Export failed.");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="(.+)"/);
      const filename = match?.[1] ?? `collection-report.${format}`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setLoading(null);
    }
  }

  const btnClass =
    "flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-[#00F2FE]/30 hover:bg-[#00F2FE]/5 hover:text-white disabled:opacity-60";

  return (
    <Card variant="glass" id="reports">
      <CardBody>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Download className="h-4 w-4 text-[#00F2FE]" />
            Export Reports
          </div>

          {error && <p className="w-full text-sm text-rose-400">{error}</p>}

          <button
            type="button"
            onClick={() => downloadReport("csv")}
            disabled={!!loading}
            className={btnClass}
          >
            {loading === "csv" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
            )}
            Full CSV
          </button>
          <button
            type="button"
            onClick={() => downloadReport("xlsx")}
            disabled={!!loading}
            className={`${btnClass} border-[#00F2FE]/20 bg-[#00F2FE]/10 text-[#00F2FE] hover:bg-[#00F2FE]/15`}
          >
            {loading === "xlsx" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4" />
            )}
            Full Excel (.xlsx)
          </button>
          <button
            type="button"
            onClick={() => downloadReport("pdf")}
            disabled={!!loading}
            className={btnClass}
          >
            {loading === "pdf" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 text-violet-400" />
            )}
            PDF Report
          </button>
          <button type="button" onClick={() => window.print()} className={btnClass}>
            <FileText className="h-4 w-4 text-slate-400" />
            Print
          </button>
        </div>
      </CardBody>
    </Card>
  );
}

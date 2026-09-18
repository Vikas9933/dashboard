"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { Download, FileSpreadsheet, FileText, ImageIcon, Loader2, Mail, Send } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { emailAnalyticsReport } from "@/app/dashboard/analytics/actions";

const btnClass =
  "flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-[#00F2FE]/30 hover:bg-[#00F2FE]/5 hover:text-white disabled:opacity-60";

export function DownloadCenter({ captureTargetId }: { captureTargetId: string }) {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [frequency, setFrequency] = useState<string>(() =>
    typeof window !== "undefined" ? localStorage.getItem("analytics-schedule-frequency") ?? "weekly" : "weekly"
  );
  const [scheduleSaved, setScheduleSaved] = useState(false);

  async function downloadReport(format: "xlsx" | "csv" | "pdf") {
    setLoading(format);
    setError(null);
    try {
      const params = new URLSearchParams(searchParams.toString());
      params.set("format", format);
      const response = await fetch(`/api/analytics/export?${params.toString()}`);
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Export failed.");
      }
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="(.+)"/);
      const filename = match?.[1] ?? `advanced-analytics.${format}`;
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

  async function downloadImage() {
    setLoading("image");
    setError(null);
    try {
      const target = document.getElementById(captureTargetId);
      if (!target) throw new Error("Nothing to capture on this tab.");
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(target, { backgroundColor: "#0B1120", scale: 1.5 });
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `advanced-analytics-${new Date().toISOString().slice(0, 10)}.png`;
      a.click();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image export failed.");
    } finally {
      setLoading(null);
    }
  }

  function handleEmailSubmit(formData: FormData) {
    searchParams.forEach((value, key) => formData.set(key, value));
    setEmailStatus(null);
    startTransition(async () => {
      const result = await emailAnalyticsReport(formData);
      if (result.error) setEmailStatus({ type: "error", message: result.error });
      else setEmailStatus({ type: "success", message: "Report emailed successfully." });
    });
  }

  function saveSchedule() {
    localStorage.setItem("analytics-schedule-frequency", frequency);
    setScheduleSaved(true);
    setTimeout(() => setScheduleSaved(false), 2500);
  }

  return (
    <Card variant="glass">
      <CardHeader variant="glass">
        <h2 className="text-base font-semibold text-white">Download Center</h2>
        <p className="mt-0.5 text-sm text-slate-400">Export the full analytics report or email it directly</p>
      </CardHeader>
      <CardBody>
        {error && <p className="mb-3 text-sm text-rose-400">{error}</p>}

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => downloadReport("csv")} disabled={!!loading} className={btnClass}>
            {loading === "csv" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 text-emerald-400" />}
            CSV
          </button>
          <button
            type="button"
            onClick={() => downloadReport("xlsx")}
            disabled={!!loading}
            className={`${btnClass} border-[#00F2FE]/20 bg-[#00F2FE]/10 text-[#00F2FE] hover:bg-[#00F2FE]/15`}
          >
            {loading === "xlsx" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            Excel (.xlsx)
          </button>
          <button type="button" onClick={() => downloadReport("pdf")} disabled={!!loading} className={btnClass}>
            {loading === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4 text-violet-400" />}
            PDF
          </button>
          <button type="button" onClick={downloadImage} disabled={!!loading} className={btnClass}>
            {loading === "image" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4 text-amber-400" />}
            Image (current tab)
          </button>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="dash-clay rounded-2xl p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-white">
              <Mail className="h-4 w-4 text-[#00F2FE]" />
              Email This Report Now
            </p>
            <form action={handleEmailSubmit} className="mt-3 flex flex-wrap gap-2">
              <input
                type="email"
                name="to"
                required
                placeholder="recipient@company.com"
                className="dash-input flex-1 rounded-xl px-3 py-2 text-sm"
              />
              <button type="submit" disabled={pending} className="dash-btn-primary flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold">
                {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Send
              </button>
            </form>
            {emailStatus && (
              <p className={`mt-2 text-xs ${emailStatus.type === "success" ? "text-emerald-400" : "text-rose-400"}`}>
                {emailStatus.message}
              </p>
            )}
          </div>

          <div className="dash-clay rounded-2xl p-4">
            <p className="text-sm font-semibold text-white">Schedule Email Reports</p>
            <p className="mt-1 text-xs text-slate-500">Save your preferred cadence — sent automatically once your admin enables scheduled delivery.</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 outline-none focus:border-[#00F2FE]/40"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
              <button
                type="button"
                onClick={saveSchedule}
                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10"
              >
                <Download className="h-3.5 w-3.5 rotate-180" />
                Save Preference
              </button>
              {scheduleSaved && <span className="text-xs text-emerald-400">Saved</span>}
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

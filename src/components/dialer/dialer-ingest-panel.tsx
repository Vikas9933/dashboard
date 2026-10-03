"use client";

import { useRef, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";

export function DialerIngestPanel() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loanNumber, setLoanNumber] = useState("");
  const [duration, setDuration] = useState("90");
  const [connected, setConnected] = useState(true);
  const [rpc, setRpc] = useState(false);
  const [followUp, setFollowUp] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function postCalls(calls: unknown[]) {
    const res = await fetch("/api/dialer/calls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ calls }),
    });
    const json = (await res.json()) as { error?: string; inserted?: number; skipped?: number; errors?: string[] };
    if (!res.ok) {
      throw new Error(json.error ?? json.errors?.[0] ?? "Failed to log calls.");
    }
    return json;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      const json = await postCalls([
        {
          loan_number: loanNumber,
          duration_seconds: Number(duration),
          connected,
          rpc,
          follow_up: followUp,
          remarks,
          dialer_source: "manual",
        },
      ]);
      if (json.errors?.length) {
        setStatus(json.errors[0]);
        return;
      }
      setStatus(`Logged ${json.inserted ?? 1} call.`);
      setLoanNumber("");
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Network error while logging the call.");
    } finally {
      setBusy(false);
    }
  }

  function onFile(file: File) {
    setBusy(true);
    setStatus(null);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
        const calls = json
          .map((row) => ({
            loan_number: String(row.loan_number ?? "").trim(),
            duration_seconds: Number(row.duration_seconds ?? 0),
            connected: String(row.connected ?? "").toLowerCase() === "true" || row.connected === 1,
            rpc: String(row.rpc ?? "").toLowerCase() === "true" || row.rpc === 1,
            follow_up: String(row.follow_up ?? "").toLowerCase() === "true" || row.follow_up === 1,
            outcome: String(row.outcome ?? "").trim() || undefined,
            call_started_at: String(row.call_started_at ?? "").trim() || undefined,
            external_call_id: String(row.external_call_id ?? "").trim() || undefined,
            remarks: String(row.remarks ?? "").trim() || undefined,
            dialer_source: "csv",
          }))
          .filter((row) => row.loan_number);
        if (!calls.length) {
          setStatus("No loan_number rows found in the file.");
          return;
        }
        const result = await postCalls(calls);
        setStatus(
          `Imported ${result.inserted ?? 0} call(s)${result.skipped ? `, skipped ${result.skipped}` : ""}${
            result.errors?.length ? `. ${result.errors[0]}` : "."
          }`
        );
        router.refresh();
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Could not parse the dialer file.");
      } finally {
        setBusy(false);
        if (fileRef.current) fileRef.current.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  }

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 outline-none focus:border-[#00F2FE]/40";

  return (
    <Card variant="glass">
      <CardHeader variant="glass">
        <h2 className="text-base font-semibold text-white">Dialer ingest</h2>
        <p className="mt-0.5 text-sm text-slate-400">
          Log a call against a loan number, upload a CSV/Excel file, or POST batches to{" "}
          <code className="text-[#00F2FE]">/api/dialer/calls</code>.
        </p>
      </CardHeader>
      <CardBody className="space-y-6">
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-slate-400">
            Loan number
            <input required className={`${inputClass} mt-1`} value={loanNumber} onChange={(e) => setLoanNumber(e.target.value)} />
          </label>
          <label className="text-xs text-slate-400">
            Duration (seconds)
            <input className={`${inputClass} mt-1`} type="number" min={0} value={duration} onChange={(e) => setDuration(e.target.value)} />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={connected} onChange={(e) => setConnected(e.target.checked)} />
            Connected
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={rpc} onChange={(e) => setRpc(e.target.checked)} />
            RPC (right-party contact)
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={followUp} onChange={(e) => setFollowUp(e.target.checked)} />
            Follow-up
          </label>
          <label className="text-xs text-slate-400 sm:col-span-2">
            Remarks
            <input className={`${inputClass} mt-1`} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </label>
          <div className="sm:col-span-2">
            <button type="submit" disabled={busy} className="dash-btn-primary">
              {busy ? "Saving…" : "Log call"}
            </button>
          </div>
        </form>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-medium text-white">Batch file</p>
          <p className="mt-1 text-xs text-slate-500">
            Columns: loan_number, duration_seconds, connected, rpc, follow_up, outcome, call_started_at, external_call_id, remarks
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="mt-3 text-sm text-slate-300"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFile(file);
            }}
          />
        </div>
        {status && <p className="text-sm text-slate-400">{status}</p>}
      </CardBody>
    </Card>
  );
}

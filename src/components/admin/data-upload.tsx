"use client";

import { useRef, useState, useTransition } from "react";
import { FileSpreadsheet, Loader2, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import { uploadAccountsFromRows } from "@/app/dashboard/admin/actions";
import type { UploadRow } from "@/lib/schemas/upload";
import { Card, CardBody } from "@/components/ui/card";

const TEMPLATE_HEADERS = [
  "loan_number",
  "customer_name",
  "mobile_number",
  "bucket",
  "product_type",
  "state",
  "city",
  "allocated_amount",
  "outstanding_amount",
  "collected_amount",
  "agency_code",
  "team_name",
  "agent_email",
];

const VALID_BUCKETS = new Set(["B1", "B2", "B3", "B4", "B5", "B6_PLUS"]);

function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    TEMPLATE_HEADERS,
    [
      "LN-900001",
      "Sample Customer",
      "9876543210",
      "B2",
      "Personal Loan",
      "Maharashtra",
      "Mumbai",
      50000,
      50000,
      12000,
    ],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Accounts");
  XLSX.writeFile(wb, "account-upload-template.xlsx");
}

export function DataUploadPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function parseFile(file: File) {
    setMessage(null);
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
          defval: "",
        });

        const rows: UploadRow[] = json
          .map((row) => ({
            loan_number: String(row.loan_number ?? "").trim(),
            customer_name: String(row.customer_name ?? "").trim(),
            mobile_number: String(row.mobile_number ?? "").trim(),
            bucket: String(row.bucket ?? "").trim().toUpperCase().replace("B6+", "B6_PLUS") as UploadRow["bucket"],
            product_type: String(row.product_type ?? "").trim(),
            state: String(row.state ?? "").trim(),
            city: String(row.city ?? "").trim(),
            allocated_amount: Number(row.allocated_amount),
            outstanding_amount: Number(row.outstanding_amount),
            collected_amount: Number(row.collected_amount ?? 0),
            agency_code: String(row.agency_code ?? "").trim() || undefined,
            team_name: String(row.team_name ?? "").trim() || undefined,
            agent_email: String(row.agent_email ?? "").trim() || undefined,
          }))
          .filter((row) => row.loan_number && row.customer_name && row.mobile_number);

        const invalid = rows.find(
          (row) =>
            !VALID_BUCKETS.has(row.bucket) ||
            Number.isNaN(row.allocated_amount) ||
            Number.isNaN(row.outstanding_amount)
        );

        if (invalid) {
          setError(`Invalid row for loan ${invalid.loan_number}. Check bucket and amounts.`);
          return;
        }

        startTransition(async () => {
          const result = await uploadAccountsFromRows(rows);
          if (result.error) setError(result.error);
          else if (result.success) setMessage(result.success);
        });
      } catch {
        setError("Could not parse the uploaded file.");
      }
    };

    reader.readAsArrayBuffer(file);
  }

  return (
    <Card variant="glass">
      <CardBody className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-white">Data Upload Through Excel</h3>
            <p className="mt-1 text-sm text-slate-400">
              Upload .xlsx or .csv with account and customer columns. Up to 1000 rows per upload.
            </p>
          </div>
          <button
            type="button"
            onClick={downloadTemplate}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-300 transition hover:border-[#00F2FE]/30 hover:bg-[#00F2FE]/5 hover:text-white"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
            Download Template
          </button>
        </div>

        {(message || error) && (
          <div
            className={`rounded-xl px-4 py-3 text-sm ${
              error
                ? "border border-rose-500/30 bg-rose-500/10 text-rose-300"
                : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
            }`}
          >
            {error ?? message}
          </div>
        )}

        <div
          className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/10 bg-white/[0.02] px-6 py-10 text-center transition hover:border-[#00F2FE]/30 hover:bg-[#00F2FE]/5"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <Upload className="mb-3 h-8 w-8 text-[#00F2FE]" />
          <p className="text-sm font-medium text-slate-200">Click to upload Excel or CSV</p>
          <p className="mt-1 text-xs text-slate-500">
            Columns: loan_number, customer_name, mobile_number, bucket, product_type, state, city,
            allocated_amount, outstanding_amount, collected_amount
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) parseFile(file);
              e.target.value = "";
            }}
          />
          {isPending && (
            <p className="mt-3 flex items-center gap-2 text-sm text-[#00F2FE]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading...
            </p>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

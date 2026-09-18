"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/format";
import { CHART_PALETTE, GRID, TICK, tooltipStyle } from "@/components/analytics/chart-theme";
import { Download, Save } from "lucide-react";
import type { FlatAccountRow } from "@/lib/services";

type Dimension = "agent" | "team" | "tl" | "agency" | "state" | "city" | "bucket" | "product" | "status";
type Measure = "allocated" | "outstanding" | "collected" | "accounts";
type Aggregation = "sum" | "avg" | "count";
type ChartKind = "table" | "bar" | "line" | "pie";

const DIMENSIONS: { id: Dimension; label: string }[] = [
  { id: "agent", label: "Agent" },
  { id: "tl", label: "Team Leader" },
  { id: "team", label: "Branch" },
  { id: "agency", label: "Agency" },
  { id: "state", label: "State" },
  { id: "city", label: "City" },
  { id: "bucket", label: "Bucket" },
  { id: "product", label: "Product" },
  { id: "status", label: "Status" },
];

const MEASURES: { id: Measure; label: string }[] = [
  { id: "collected", label: "Collected Amount" },
  { id: "allocated", label: "Allocated Amount" },
  { id: "outstanding", label: "Outstanding Amount" },
  { id: "accounts", label: "Account Count" },
];

const selectClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 outline-none transition focus:border-[#00F2FE]/40";

interface BuiltRow {
  key: string;
  measure: number;
  count: number;
  columns: Record<string, number>;
}

export function CustomAnalyticsBuilder({ rows }: { rows: FlatAccountRow[] }) {
  const [groupBy, setGroupBy] = useState<Dimension>("agency");
  const [columnBy, setColumnBy] = useState<Dimension | "none">("none");
  const [measure, setMeasure] = useState<Measure>("collected");
  const [aggregation, setAggregation] = useState<Aggregation>("sum");
  const [chartType, setChartType] = useState<ChartKind>("bar");
  const [filterDim, setFilterDim] = useState<Dimension | "none">("none");
  const [filterValue, setFilterValue] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [savedReports, setSavedReports] = useState<string[]>([]);
  const [reportName, setReportName] = useState("");

  const filterOptions = useMemo(() => {
    if (filterDim === "none") return [];
    return [...new Set(rows.map((r) => r[filterDim]))].sort();
  }, [rows, filterDim]);

  const columnKeys = useMemo(() => {
    if (columnBy === "none") return [];
    return [...new Set(rows.map((r) => r[columnBy]))].sort().slice(0, 8);
  }, [rows, columnBy]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (filterDim !== "none" && filterValue && r[filterDim] !== filterValue) return false;
      if (dateFrom && r.allocatedAt < dateFrom) return false;
      if (dateTo && r.allocatedAt > dateTo) return false;
      return true;
    });
  }, [rows, filterDim, filterValue, dateFrom, dateTo]);

  const built = useMemo<BuiltRow[]>(() => {
    const groups = new Map<string, { sum: number; count: number; columns: Record<string, { sum: number; count: number }> }>();
    for (const r of filteredRows) {
      const key = r[groupBy];
      const value = measure === "accounts" ? 1 : r[measure];
      const g = groups.get(key) ?? { sum: 0, count: 0, columns: {} };
      g.sum += value;
      g.count += 1;
      if (columnBy !== "none") {
        const colKey = r[columnBy];
        const c = g.columns[colKey] ?? { sum: 0, count: 0 };
        c.sum += value;
        c.count += 1;
        g.columns[colKey] = c;
      }
      groups.set(key, g);
    }

    function aggValue(sum: number, count: number) {
      if (aggregation === "avg") return count > 0 ? sum / count : 0;
      if (aggregation === "count") return count;
      return sum;
    }

    return Array.from(groups.entries())
      .map(([key, g]) => ({
        key,
        measure: aggValue(g.sum, g.count),
        count: g.count,
        columns: Object.fromEntries(
          Object.entries(g.columns).map(([ck, cv]) => [ck, aggValue(cv.sum, cv.count)])
        ),
      }))
      .sort((a, b) => b.measure - a.measure)
      .slice(0, 30);
  }, [filteredRows, groupBy, columnBy, measure, aggregation]);

  const formatVal = (v: number) => (measure === "accounts" || aggregation === "count" ? formatNumber(v) : formatCurrency(v));

  function exportCsv() {
    const header = columnBy === "none" ? ["Group", "Value"] : ["Group", ...columnKeys, "Total"];
    const lines = built.map((r) =>
      columnBy === "none"
        ? [r.key, r.measure]
        : [r.key, ...columnKeys.map((ck) => r.columns[ck] ?? 0), r.measure]
    );
    const csv = [header, ...lines].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `custom-report-${groupBy}-${measure}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportXlsx() {
    const XLSX = await import("xlsx");
    const header = columnBy === "none" ? ["Group", "Value"] : ["Group", ...columnKeys, "Total"];
    const lines = built.map((r) =>
      columnBy === "none"
        ? [r.key, r.measure]
        : [r.key, ...columnKeys.map((ck) => r.columns[ck] ?? 0), r.measure]
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([header, ...lines]), "Custom Report");
    XLSX.writeFile(wb, `custom-report-${groupBy}-${measure}.xlsx`);
  }

  function saveReport() {
    const name = reportName.trim() || `${groupBy} by ${measure} (${aggregation})`;
    const config = { name, groupBy, columnBy, measure, aggregation, chartType, filterDim, filterValue, dateFrom, dateTo };
    try {
      const existing = JSON.parse(localStorage.getItem("analytics-custom-reports") ?? "[]");
      const updated = [...existing, config];
      localStorage.setItem("analytics-custom-reports", JSON.stringify(updated));
      setSavedReports(updated.map((r: { name: string }) => r.name));
      setReportName("");
    } catch {
      // localStorage unavailable — ignore silently
    }
  }

  return (
    <Card variant="glass">
      <CardHeader variant="glass">
        <h2 className="text-base font-semibold text-white">Custom Analytics Builder</h2>
        <p className="mt-0.5 text-sm text-slate-400">Build your own report — no coding required, works like a simplified Pivot Builder</p>
      </CardHeader>
      <CardBody>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          <div>
            <label className="mb-1 block text-xs text-slate-500">Rows / Group By</label>
            <select className={selectClass} value={groupBy} onChange={(e) => setGroupBy(e.target.value as Dimension)}>
              {DIMENSIONS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Columns</label>
            <select className={selectClass} value={columnBy} onChange={(e) => setColumnBy(e.target.value as Dimension | "none")}>
              <option value="none">None</option>
              {DIMENSIONS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Measure</label>
            <select className={selectClass} value={measure} onChange={(e) => setMeasure(e.target.value as Measure)}>
              {MEASURES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Aggregation</label>
            <select className={selectClass} value={aggregation} onChange={(e) => setAggregation(e.target.value as Aggregation)}>
              <option value="sum">Sum</option>
              <option value="avg">Average</option>
              <option value="count">Count</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Chart Type</label>
            <select className={selectClass} value={chartType} onChange={(e) => setChartType(e.target.value as ChartKind)}>
              <option value="table">Table</option>
              <option value="bar">Bar</option>
              <option value="line">Line</option>
              <option value="pie">Pie</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Filter By</label>
            <select
              className={selectClass}
              value={filterDim}
              onChange={(e) => {
                setFilterDim(e.target.value as Dimension | "none");
                setFilterValue("");
              }}
            >
              <option value="none">None</option>
              {DIMENSIONS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          {filterDim !== "none" && (
            <div>
              <label className="mb-1 block text-xs text-slate-500">Filter Value</label>
              <select className={selectClass} value={filterValue} onChange={(e) => setFilterValue(e.target.value)}>
                <option value="">All</option>
                {filterOptions.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs text-slate-500">Allocated From</label>
            <input type="date" className={selectClass} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Allocated To</label>
            <input type="date" className={selectClass} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Report name (optional)"
            value={reportName}
            onChange={(e) => setReportName(e.target.value)}
            className="dash-input w-56 rounded-xl px-3 py-2 text-sm"
          />
          <button type="button" onClick={saveReport} className="dash-btn-primary flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold">
            <Save className="h-3.5 w-3.5" />
            Save Report
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => void exportXlsx()}
            className="flex items-center gap-1.5 rounded-xl border border-[#00F2FE]/20 bg-[#00F2FE]/10 px-3 py-2 text-xs font-semibold text-[#00F2FE] hover:bg-[#00F2FE]/15"
          >
            <Download className="h-3.5 w-3.5" />
            Export Excel
          </button>
          {savedReports.length > 0 && (
            <span className="text-xs text-slate-500">Saved: {savedReports[savedReports.length - 1]}</span>
          )}
        </div>

        <div className="mt-5">
          {built.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">No rows match the selected filters.</p>
          ) : chartType === "table" ? (
            <div className="max-h-96 overflow-y-auto rounded-xl border border-white/5">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white/5 text-xs uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-3 py-2 text-left">{DIMENSIONS.find((d) => d.id === groupBy)?.label}</th>
                    {columnBy !== "none"
                      ? columnKeys.map((ck) => (
                          <th key={ck} className="px-3 py-2 text-right">
                            {ck}
                          </th>
                        ))
                      : null}
                    <th className="px-3 py-2 text-right">{columnBy === "none" ? "Value" : "Total"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {built.map((r) => (
                    <tr key={r.key} className="text-slate-300">
                      <td className="px-3 py-2 font-medium text-white">{r.key}</td>
                      {columnBy !== "none"
                        ? columnKeys.map((ck) => (
                            <td key={ck} className="px-3 py-2 text-right">
                              {formatVal(r.columns[ck] ?? 0)}
                            </td>
                          ))
                        : null}
                      <td className="px-3 py-2 text-right font-semibold">{formatVal(r.measure)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : chartType === "pie" ? (
            <div className="dash-chart-3d h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={built} dataKey="measure" nameKey="key" cx="50%" cy="50%" outerRadius={100} label={(e) => String(e.key ?? "")}>
                    {built.map((_, i) => (
                      <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [formatVal(Number(v)), "Value"]} contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="dash-chart-3d h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === "line" ? (
                  <LineChart data={built} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                    <XAxis dataKey="key" tick={{ fill: TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v) => [formatVal(Number(v)), "Value"]} contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="measure" stroke={CHART_PALETTE[0]} strokeWidth={3} dot={{ r: 3 }} />
                  </LineChart>
                ) : (
                  <BarChart data={built} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                    <XAxis dataKey="key" tick={{ fill: TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v) => [formatVal(Number(v)), "Value"]} contentStyle={tooltipStyle} />
                    <Bar dataKey="measure" radius={[6, 6, 0, 0]}>
                      {built.map((_, i) => (
                        <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

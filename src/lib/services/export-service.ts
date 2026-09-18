import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { logAudit } from "@/lib/audit";
import { canExport } from "@/lib/auth/permissions";
import { getSessionProfile } from "@/lib/auth/session";
import {
  getAgentPerformance,
  getBucketPerformance,
  getDashboardKpis,
  getFieldVisits,
  getSettlements,
  getTeamPerformance,
  parseFilters,
} from "@/lib/services/analytics-service";
import type { DashboardFilters } from "@/lib/types";

export type ExportFormat = "xlsx" | "csv" | "pdf";

function buildReportData(filters: DashboardFilters) {
  return Promise.all([
    getDashboardKpis(filters),
    getAgentPerformance(filters),
    getTeamPerformance(filters),
    getBucketPerformance(filters),
    getSettlements(),
    getFieldVisits(),
  ]);
}

function kpisToRows(kpis: Awaited<ReturnType<typeof getDashboardKpis>>) {
  return [
    ["Metric", "Value"],
    ["Total Accounts", kpis.totalAccounts],
    ["Total Outstanding", kpis.totalOutstanding],
    ["Total Collected", kpis.totalCollected],
    ["Collection %", kpis.collectionPercentage.toFixed(2)],
    ["PTP Count", kpis.ptpCount],
    ["PTP Amount", kpis.ptpAmount],
    ["Kept PTP", kpis.keptPtp],
    ["Broken PTP", kpis.brokenPtp],
    ["Active Agents", kpis.activeAgents],
    ["Active Teams", kpis.activeTeams],
  ];
}

export async function generateExport(
  format: ExportFormat,
  searchParams: Record<string, string | undefined>
) {
  const profile = await getSessionProfile();
  if (!profile || !canExport(profile)) {
    throw new Error("Export not permitted.");
  }

  const filters = parseFilters(searchParams);
  const [kpis, agents, teams, buckets, settlements, visits] = await buildReportData(filters);

  const agentRows: (string | number)[][] = [
    ["Rank", "Agent", "Accounts", "Collection", "Collection %", "PTP Count", "PTP Amount", "Kept PTP", "Broken PTP"],
    ...agents.map((a) => [
      a.rank, a.agentName, a.allocatedAccounts, a.collectedAmount,
      a.collectionPercentage.toFixed(1), a.ptpCount, a.ptpAmount, a.keptPtp, a.brokenPtp,
    ]),
  ];

  const teamRows: (string | number)[][] = [
    ["Rank", "Team Leader", "Team Size", "Allocation", "Collection", "Achievement %"],
    ...teams.map((t) => [t.rank, t.teamLeaderName, t.teamSize, t.allocation, t.collection, t.achievement.toFixed(1)]),
  ];

  const bucketRows: (string | number)[][] = [
    ["Bucket", "Accounts", "Allocated", "Collected", "Achievement %"],
    ...buckets.map((b) => [b.bucket, b.accountCount, b.allocated, b.collected, b.achievement.toFixed(1)]),
  ];

  const settlementRows: (string | number)[][] = [
    ["Customer", "Loan", "Outstanding", "Settlement", "Request Date", "Status"],
    ...settlements.map((s) => [s.customerName, s.loanNumber, s.outstandingAmount, s.settlementAmount, s.requestDate, s.status]),
  ];

  const visitRows: (string | number)[][] = [
    ["Date", "Customer", "Loan", "Agent", "Met", "PTP", "PTP Amount", "Settlement Interest", "Remarks"],
    ...visits.map((v) => [
      v.visitDate, v.customerName, v.loanNumber, v.agentName,
      v.customerMet ? "Yes" : "No", v.promiseToPay ? "Yes" : "No",
      v.ptpAmount ?? "", v.settlementInterest ? "Yes" : "No", v.remarks ?? "",
    ]),
  ];

  await logAudit({
    userId: profile.id,
    action: "export.report",
    entity: "dashboard",
    payload: { format, filters },
  });

  const sheets = [
    { name: "KPIs", rows: kpisToRows(kpis) },
    { name: "Agent Performance", rows: agentRows },
    { name: "Team Performance", rows: teamRows },
    { name: "Bucket Analysis", rows: bucketRows },
    { name: "Settlements", rows: settlementRows },
    { name: "Field Visits", rows: visitRows },
  ];

  const filename = `collection-report-${new Date().toISOString().slice(0, 10)}`;

  if (format === "xlsx") {
    const wb = XLSX.utils.book_new();
    for (const sheet of sheets) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheet.rows), sheet.name);
    }
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    return { buffer, contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", filename: `${filename}.xlsx` };
  }

  if (format === "csv") {
    const csv = sheets
      .map((s) => `--- ${s.name} ---\n${s.rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")}`)
      .join("\n\n");
    return { buffer: Buffer.from(csv, "utf-8"), contentType: "text/csv", filename: `${filename}.csv` };
  }

  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text("Collection & Recovery Dashboard Report", 14, 15);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);

  let y = 30;
  for (const sheet of sheets.slice(0, 4)) {
    doc.text(sheet.name, 14, y);
    autoTable(doc, {
      startY: y + 4,
      head: [sheet.rows[0].map(String)],
      body: sheet.rows.slice(1).map((r) => r.map(String)),
      theme: "grid",
      styles: { fontSize: 8 },
    });
    y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 12;
    if (y > 180) {
      doc.addPage();
      y = 20;
    }
  }

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
  return { buffer: pdfBuffer, contentType: "application/pdf", filename: `${filename}.pdf` };
}

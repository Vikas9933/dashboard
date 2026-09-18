import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { logAudit } from "@/lib/audit";
import { canExport } from "@/lib/auth/permissions";
import { getSessionProfile } from "@/lib/auth/session";
import { getAnalyticsWorkspaceData } from "@/lib/services/advanced-analytics-service";
import { parseFilters } from "@/lib/services/analytics-service";
import type { DashboardFilters } from "@/lib/types";

export type AnalyticsExportFormat = "xlsx" | "csv" | "pdf";

function buildSheets(data: Awaited<ReturnType<typeof getAnalyticsWorkspaceData>>) {
  const { executive: e, trends, ptp, funnel, productivity, forecast } = data;

  const executiveRows: (string | number)[][] = [
    ["Metric", "Value"],
    ["FTD Collection", e.ftdCollection],
    ["MTD Collection", e.mtdCollection],
    ["Target", e.target],
    ["Achievement %", e.achievementPercent.toFixed(2)],
    ["Current DRR", e.currentDrr.toFixed(2)],
    ["Required DRR", e.requiredDrr.toFixed(2)],
    ["Month End Projection", e.monthEndProjection.toFixed(2)],
    ["Variance Against Target", e.varianceAgainstTarget.toFixed(2)],
    ["Recovery Efficiency %", e.recoveryEfficiency.toFixed(2)],
    ["Collection Velocity %", e.collectionVelocity.toFixed(2)],
    ["Risk of Missing Target", e.riskOfMissingTarget],
  ];

  const trendRows: (string | number)[][] = [
    ["Date", "Amount"],
    ...trends.daily.map((d) => [d.label, d.amount]),
  ];

  const ptpRows: (string | number)[][] = [
    ["Agent", "Total PTP", "Amount", "Kept", "Broken", "Conversion %"],
    ...ptp.agentWise.map((a) => [a.name, a.total, a.amount, a.kept, a.broken, a.conversionPercent.toFixed(1)]),
  ];

  const funnelRows: (string | number)[][] = [
    ["Stage", "Count", "Conversion From Previous %", "Conversion From Start %"],
    ...funnel.map((f) => [f.stage, f.count, f.conversionFromPrevious.toFixed(1), f.conversionFromStart.toFixed(1)]),
  ];

  const productivityRows: (string | number)[][] = [
    ["Rank", "Agent", "Accounts", "Allocated", "Collected", "Achievement %"],
    ...productivity.agentRanking.map((a) => [a.rank, a.name, a.accounts, a.allocated, a.collected, a.achievement.toFixed(1)]),
  ];

  const forecastRows: (string | number)[][] = [
    ["Metric", "Value"],
    ["Expected Month End Collection", forecast.monthEndCollection.toFixed(2)],
    ["Expected Achievement %", forecast.expectedAchievementPercent.toFixed(2)],
    ["Expected PTP", forecast.expectedPtp],
    ["Expected Broken PTP", forecast.expectedBrokenPtp],
    ["Risk Score", forecast.riskScore.toFixed(1)],
    ["Risk Level", forecast.riskLevel],
  ];

  return [
    { name: "Executive Summary", rows: executiveRows },
    { name: "Collection Trend", rows: trendRows },
    { name: "PTP by Agent", rows: ptpRows },
    { name: "Collection Funnel", rows: funnelRows },
    { name: "Agent Productivity", rows: productivityRows },
    { name: "Forecast", rows: forecastRows },
  ];
}

export async function generateAnalyticsExport(
  format: AnalyticsExportFormat,
  searchParams: Record<string, string | undefined>
) {
  const profile = await getSessionProfile();
  if (!profile || !canExport(profile)) {
    throw new Error("Export not permitted.");
  }

  const filters: DashboardFilters = parseFilters(searchParams);
  const data = await getAnalyticsWorkspaceData(filters);
  const sheets = buildSheets(data);
  const filename = `advanced-analytics-${new Date().toISOString().slice(0, 10)}`;

  await logAudit({
    userId: profile.id,
    action: "export.analytics",
    entity: "analytics",
    payload: { format, filters },
  });

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
  doc.text("Advanced Analytics & Intelligence Report", 14, 15);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);

  let y = 30;
  for (const sheet of sheets) {
    doc.text(sheet.name, 14, y);
    autoTable(doc, {
      startY: y + 4,
      head: [sheet.rows[0].map(String)],
      body: sheet.rows.slice(1, 40).map((r) => r.map(String)),
      theme: "grid",
      styles: { fontSize: 8 },
    });
    y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 12;
    if (y > 170) {
      doc.addPage();
      y = 20;
    }
  }

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
  return { buffer: pdfBuffer, contentType: "application/pdf", filename: `${filename}.pdf` };
}

export async function buildAnalyticsEmailSummary(searchParams: Record<string, string | undefined>) {
  const filters: DashboardFilters = parseFilters(searchParams);
  const data = await getAnalyticsWorkspaceData(filters);
  const { executive: e, forecast } = data;

  const row = (label: string, value: string) =>
    `<tr><td style="padding:6px 12px;color:#94a3b8;font-size:13px;">${label}</td><td style="padding:6px 12px;font-weight:600;color:#0f172a;font-size:13px;">${value}</td></tr>`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;">
      <h2 style="color:#0f172a;">Advanced Analytics — Executive Summary</h2>
      <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:8px;">
        ${row("MTD Collection", `₹${e.mtdCollection.toLocaleString("en-IN")}`)}
        ${row("Target", `₹${e.target.toLocaleString("en-IN")}`)}
        ${row("Achievement %", `${e.achievementPercent.toFixed(1)}%`)}
        ${row("Current DRR", `₹${e.currentDrr.toLocaleString("en-IN")}`)}
        ${row("Required DRR", `₹${e.requiredDrr.toLocaleString("en-IN")}`)}
        ${row("Month End Projection", `₹${e.monthEndProjection.toLocaleString("en-IN")}`)}
        ${row("Expected Achievement (Forecast)", `${forecast.expectedAchievementPercent.toFixed(1)}%`)}
        ${row("Risk Level", forecast.riskLevel.toUpperCase())}
      </table>
      <p style="color:#94a3b8;font-size:12px;margin-top:16px;">Generated automatically from the Advanced Analytics &amp; Intelligence module.</p>
    </div>
  `;

  return { html, subject: `Analytics Report — ${new Date().toLocaleDateString("en-IN")}` };
}

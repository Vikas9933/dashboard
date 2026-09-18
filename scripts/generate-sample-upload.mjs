/**
 * Generates Excel/CSV sample files for Client Admin → Data upload.
 * Matches src/lib/schemas/upload.ts and default tenant provisioning (HQ01 / Default Team).
 *
 * Usage: npm run generate:sample-upload
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "samples");

/** Same defaults as src/lib/services/tenant-provisioning.ts */
export const DEFAULT_AGENCY_CODE = "HQ01";
export const DEFAULT_TEAM_NAME = "Default Team";

const HEADERS = [
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

const BUCKETS = ["B1", "B2", "B3", "B4", "B5", "B6_PLUS"];
const PRODUCTS = ["Personal Loan", "Home Loan", "Auto Loan", "Credit Card", "Business Loan"];

const GEO = {
  Maharashtra: ["Mumbai", "Pune", "Nagpur", "Thane"],
  Delhi: ["New Delhi", "Dwarka", "Rohini"],
  Karnataka: ["Bengaluru", "Mysuru", "Hubli"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai"],
  Telangana: ["Hyderabad", "Warangal"],
  Gujarat: ["Ahmedabad", "Surat", "Vadodara"],
};

const FIRST = ["Rahul", "Priya", "Amit", "Sneha", "Vikram", "Anjali", "Rohan", "Neha"];
const LAST = ["Sharma", "Verma", "Kumar", "Singh", "Joshi", "Mehta", "Patel", "Nair"];

function mulberry32(seed) {
  return function next() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

function generateRows(count, options = {}) {
  const { includeOrgColumns = false, startIndex = 1, loanPrefix = "LN" } = options;
  const rng = mulberry32(42 + count);
  const states = Object.keys(GEO);
  const rows = [];

  for (let i = 0; i < count; i++) {
    const n = startIndex + i;
    const state = pick(rng, states);
    const allocated = (pick(rng, [5, 8, 10, 12, 15, 20, 25, 30, 50, 75, 100]) * 10000);
    const outstanding = Math.floor(allocated * (0.4 + rng() * 0.55));
    const collected =
      rng() < 0.25 ? 0 : Math.floor(outstanding * (0.1 + rng() * 0.6));

    rows.push([
      `${loanPrefix}-${900000 + n}`,
      `${pick(rng, FIRST)} ${pick(rng, LAST)}`,
      String(7000000000 + Math.floor(rng() * 2999999999)).slice(0, 10),
      pick(rng, BUCKETS),
      pick(rng, PRODUCTS),
      state,
      pick(rng, GEO[state]),
      allocated,
      outstanding,
      collected,
      includeOrgColumns ? DEFAULT_AGENCY_CODE : "",
      includeOrgColumns ? DEFAULT_TEAM_NAME : "",
      "", // leave agent_email blank — uses first active agent in tenant
    ]);
  }

  return rows;
}

function writeWorkbook(filename, rows) {
  const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Accounts");
  XLSX.writeFile(wb, join(OUT_DIR, filename));
}

function writeCsv(filename, rows) {
  const escape = (value) => {
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = [HEADERS.join(",")];
  for (const row of rows) {
    lines.push(row.map(escape).join(","));
  }
  writeFileSync(join(OUT_DIR, filename), `${lines.join("\n")}\n`, "utf8");
}

mkdirSync(OUT_DIR, { recursive: true });

const miniRows = generateRows(10);
const sampleRows = generateRows(100);
const largeRows = generateRows(500, { startIndex: 101 }); // LN-900101..900600
const orgRows = generateRows(25, { includeOrgColumns: true, startIndex: 601, loanPrefix: "LN-ORG" });

writeWorkbook("account-upload-template.xlsx", [
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
    "",
    "",
    "",
  ],
]);

writeWorkbook("account-upload-mini.xlsx", miniRows);
writeCsv("account-upload-mini.csv", miniRows);

writeWorkbook("account-upload-sample-100.xlsx", sampleRows);
writeCsv("account-upload-sample-100.csv", sampleRows);

writeWorkbook("account-upload-sample-500.xlsx", largeRows);

writeWorkbook("account-upload-with-org-columns.xlsx", orgRows);

console.log(`Sample upload files written to ${OUT_DIR}`);
console.log("  account-upload-template.xlsx       — 1 example row");
console.log("  account-upload-mini.xlsx/.csv    — 10 rows (quick test)");
console.log("  account-upload-sample-100.xlsx   — 100 rows");
console.log("  account-upload-sample-500.xlsx   — 500 rows");
console.log("  account-upload-with-org-columns  — 25 rows with HQ01 + Default Team");
console.log("");
console.log("Before upload: create at least one Agent under your client.");
console.log("Leave agency_code / team_name / agent_email blank to use tenant defaults.");

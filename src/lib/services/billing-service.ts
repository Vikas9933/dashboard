export type BillingRuleType =
  | "percentage"
  | "fixed_per_resolution"
  | "hybrid"
  | "slab_amount"
  | "slab_count"
  | "bucket_tiered";

export type BillingApprovalStatus = "pending_approval" | "approved" | "disputed" | "held";
export type BillingPaymentStatus = "unpaid" | "processing" | "paid";

export interface SlabAmountTier {
  min: number;
  max: number; // 0 or Infinity for uncapped
  rate: number; // percentage
}

export interface SlabCountTier {
  min: number;
  max: number;
  feePerCase: number;
}

export interface BillingRule {
  id: string;
  name: string;
  description: string;
  ruleType: BillingRuleType;
  clientBank: string; // "All" or specific bank
  productType: string; // "All" or specific product
  bucket: string; // "All" or "B1", "B2", etc.
  agencyName: string; // "All" or specific agency
  percentageRate: number; // e.g., 6.5%
  fixedAmount: number; // e.g., ₹500
  slabAmountConfig?: SlabAmountTier[];
  slabCountConfig?: SlabCountTier[];
  bucketMultipliers?: Record<string, number>;
  minRecoveryThreshold?: number; // Minimum collection required
  bonusRate?: number; // Extra bonus %
  applyGst: boolean;
  gstRate: number; // 18%
  applyTds: boolean;
  tdsRate: number; // 2% or 10%
  priority: number; // Higher number = evaluated first
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BillingAuditEntry {
  timestamp: string;
  action: string;
  performedBy: string;
  previousStatus?: string;
  newStatus?: string;
  previousAmount?: number;
  newAmount?: number;
  reason?: string;
  details?: string;
}

export interface CaseBillingRecord {
  id: string;
  accountId: string;
  loanNumber: string;
  customerName: string;
  clientBank: string;
  productType: string;
  bucket: string;
  agencyName: string;
  teamLeaderName: string;
  agentId: string;
  agentName: string;

  resolutionDate: string;
  resolutionAmount: number;
  resolutionType: "full_paid" | "settled" | "partial_recovery";

  matchedRuleId: string;
  matchedRuleName: string;
  ruleTypeApplied: BillingRuleType;
  rateFormulaApplied: string;
  effectiveRatePct: number;

  calculatedBilling: number;
  incentiveBonus: number;
  deductions: number;
  approvedBilling: number;

  gstAmount: number;
  tdsAmount: number;
  netPayable: number;

  approvalStatus: BillingApprovalStatus;
  paymentStatus: BillingPaymentStatus;
  paymentReference?: string;
  paymentDate?: string;

  notes?: string;
  approvedBy?: string;
  approvedAt?: string;

  auditLogs: BillingAuditEntry[];
}

export interface BillingFilterState {
  bank?: string;
  product?: string;
  agency?: string;
  teamLeader?: string;
  agentId?: string;
  bucket?: string;
  approvalStatus?: string;
  paymentStatus?: string;
  datePreset?: "today" | "yesterday" | "last7" | "last30" | "this_month" | "last_month" | "all";
  dateFrom?: string;
  dateTo?: string;
  searchQuery?: string;
}

export interface BillingKpis {
  totalResolutions: number;
  totalResolutionAmount: number;
  totalGeneratedBilling: number;
  effectiveBillingYieldPct: number;
  approvedBillingAmount: number;
  pendingApprovalAmount: number;
  paidPayoutAmount: number;
  unpaidPayoutAmount: number;
  heldBillingAmount: number;
  avgBillingPerResolution: number;
  highestBillingAgency: { name: string; amount: number };
  topEarningAgent: { name: string; amount: number; resolutions: number };
}

export interface DrilldownHierarchyItem {
  id: string;
  name: string;
  level: "bank" | "product" | "agency" | "tl" | "agent";
  resolvedCasesCount: number;
  resolutionAmount: number;
  applicableRuleName: string;
  applicableRateText: string;
  generatedBilling: number;
  approvedBilling: number;
  paidPayout: number;
  effectiveYieldPct: number;
  children?: DrilldownHierarchyItem[];
  caseRecords?: CaseBillingRecord[];
}

export interface BankBillingReportRow {
  bank: string;
  resolutionCount: number;
  collectionAmount: number;
  generatedBilling: number;
  approvedBilling: number;
  paidPayout: number;
  unpaidPayout: number;
  effectiveRate: number;
  activeRule: string;
}

export interface ProductBillingReportRow {
  product: string;
  resolutionCount: number;
  collectionAmount: number;
  generatedBilling: number;
  approvedBilling: number;
  effectiveRate: number;
}

export interface AgencyBillingReportRow {
  agency: string;
  resolutionCount: number;
  collectionAmount: number;
  generatedBilling: number;
  approvedBilling: number;
  paidPayout: number;
  pendingPayout: number;
  netPayableAfterTds: number;
}

export interface TLBillingReportRow {
  teamLeader: string;
  agency: string;
  agentCount: number;
  resolutionCount: number;
  collectionAmount: number;
  generatedBilling: number;
  approvedBilling: number;
}

export interface AgentBillingReportRow {
  agentId: string;
  agentName: string;
  agency: string;
  teamLeader: string;
  resolutionCount: number;
  collectionAmount: number;
  applicableRate: string;
  generatedBilling: number;
  approvedBilling: number;
  paidAmount: number;
  paymentStatus: string;
}

export interface DailyBillingPoint {
  date: string;
  resolutions: number;
  collectionAmount: number;
  billingGenerated: number;
  approvedBilling: number;
}

export interface MonthlyBillingPoint {
  month: string;
  resolutions: number;
  collectionAmount: number;
  billingGenerated: number;
  approvedBilling: number;
  paidPayout: number;
}

export interface BillingReportsData {
  bankWise: BankBillingReportRow[];
  productWise: ProductBillingReportRow[];
  agencyWise: AgencyBillingReportRow[];
  tlWise: TLBillingReportRow[];
  agentWise: AgentBillingReportRow[];
  resolutionWise: CaseBillingRecord[];
  dailyTimeline: DailyBillingPoint[];
  monthlyTrend: MonthlyBillingPoint[];
  pendingVsApproved: {
    pendingCount: number;
    pendingAmount: number;
    approvedCount: number;
    approvedAmount: number;
    heldCount: number;
    heldAmount: number;
    disputedCount: number;
    disputedAmount: number;
  };
  paidVsUnpaid: {
    paidCount: number;
    paidAmount: number;
    processingCount: number;
    processingAmount: number;
    unpaidCount: number;
    unpaidAmount: number;
  };
}

export interface BillingWorkspaceData {
  filters: BillingFilterState;
  filterOptions: {
    banks: string[];
    products: string[];
    agencies: string[];
    teamLeaders: string[];
    agents: { id: string; name: string }[];
    buckets: string[];
    approvalStatuses: string[];
    paymentStatuses: string[];
  };
  kpis: BillingKpis;
  rules: BillingRule[];
  hierarchy: DrilldownHierarchyItem[];
  reports: BillingReportsData;
  allRecords: CaseBillingRecord[];
}

/* ────────────────────────────────────────────────────────────────────────
 * Seed Default Configurable Billing Rules
 * ──────────────────────────────────────────────────────────────────────── */

const DEFAULT_BILLING_RULES: BillingRule[] = [
  {
    id: "rule-hdfc-cards",
    name: "HDFC Cards - High Yield Tiered Slab",
    description: "Slab-based payout for Credit Card write-offs and settlements for HDFC Bank",
    ruleType: "slab_amount",
    clientBank: "HDFC Bank",
    productType: "Credit Cards",
    bucket: "All",
    agencyName: "All",
    percentageRate: 0,
    fixedAmount: 0,
    slabAmountConfig: [
      { min: 0, max: 50000, rate: 5.0 },
      { min: 50001, max: 150000, rate: 7.5 },
      { min: 150001, max: 300000, rate: 10.0 },
      { min: 300001, max: 0, rate: 12.5 },
    ],
    applyGst: true,
    gstRate: 18,
    applyTds: true,
    tdsRate: 2,
    priority: 90,
    isActive: true,
    createdAt: "2026-01-15T09:00:00Z",
    updatedAt: "2026-02-10T14:30:00Z",
  },
  {
    id: "rule-sbi-fixed-plus-pct",
    name: "SBI Card - Hybrid Resolution Fee + 5%",
    description: "Fixed incentive of ₹350 per case plus 5% of actual recovery",
    ruleType: "hybrid",
    clientBank: "SBI Card",
    productType: "All",
    bucket: "All",
    agencyName: "All",
    percentageRate: 5.0,
    fixedAmount: 350,
    applyGst: true,
    gstRate: 18,
    applyTds: true,
    tdsRate: 2,
    priority: 85,
    isActive: true,
    createdAt: "2026-01-20T11:00:00Z",
    updatedAt: "2026-03-01T10:00:00Z",
  },
  {
    id: "rule-icici-personal-loans",
    name: "ICICI Personal Loans - 6.5% Collection Fee",
    description: "Standard 6.5% collection percentage on recovered amount with NPA multiplier",
    ruleType: "bucket_tiered",
    clientBank: "ICICI Bank",
    productType: "Personal Loans",
    bucket: "All",
    agencyName: "All",
    percentageRate: 6.5,
    fixedAmount: 0,
    bucketMultipliers: {
      B1: 1.0,
      B2: 1.15,
      B3: 1.35,
      B4: 1.5,
      B5: 1.75,
      B6_PLUS: 2.0,
    },
    applyGst: true,
    gstRate: 18,
    applyTds: true,
    tdsRate: 2,
    priority: 80,
    isActive: true,
    createdAt: "2026-02-01T08:00:00Z",
    updatedAt: "2026-02-28T12:00:00Z",
  },
  {
    id: "rule-axis-auto-fixed",
    name: "Axis Bank - Fixed Resolution Bounty",
    description: "Flat ₹1,200 payout per resolved Auto Loan account",
    ruleType: "fixed_per_resolution",
    clientBank: "Axis Bank",
    productType: "Auto Loans",
    bucket: "All",
    agencyName: "All",
    percentageRate: 0,
    fixedAmount: 1200,
    applyGst: true,
    gstRate: 18,
    applyTds: true,
    tdsRate: 2,
    priority: 75,
    isActive: true,
    createdAt: "2026-02-05T10:00:00Z",
    updatedAt: "2026-02-20T15:00:00Z",
  },
  {
    id: "rule-apex-agency-accelerator",
    name: "Apex Recovery - Performance Volume Slab",
    description: "Volume-based tiering: higher fee per case as resolution counts exceed milestones",
    ruleType: "slab_count",
    clientBank: "All",
    productType: "All",
    bucket: "All",
    agencyName: "Apex Recovery Services",
    percentageRate: 0,
    fixedAmount: 0,
    slabCountConfig: [
      { min: 1, max: 15, feePerCase: 450 },
      { min: 16, max: 35, feePerCase: 650 },
      { min: 36, max: 0, feePerCase: 900 },
    ],
    applyGst: true,
    gstRate: 18,
    applyTds: true,
    tdsRate: 2,
    priority: 70,
    isActive: true,
    createdAt: "2026-01-10T12:00:00Z",
    updatedAt: "2026-03-05T09:30:00Z",
  },
  {
    id: "rule-kotak-standard",
    name: "Kotak Mahindra - 5.5% Flat Recovery",
    description: "5.5% billing rate on all recoveries for Kotak portfolios",
    ruleType: "percentage",
    clientBank: "Kotak Mahindra Bank",
    productType: "All",
    bucket: "All",
    agencyName: "All",
    percentageRate: 5.5,
    fixedAmount: 0,
    applyGst: true,
    gstRate: 18,
    applyTds: true,
    tdsRate: 2,
    priority: 60,
    isActive: true,
    createdAt: "2026-01-05T14:00:00Z",
    updatedAt: "2026-01-05T14:00:00Z",
  },
  {
    id: "rule-default-fallback",
    name: "Standard Industry Fallback - 5.0% Collection",
    description: "Default fallback rate of 5.0% for any unmapped commercial agreements",
    ruleType: "percentage",
    clientBank: "All",
    productType: "All",
    bucket: "All",
    agencyName: "All",
    percentageRate: 5.0,
    fixedAmount: 0,
    applyGst: true,
    gstRate: 18,
    applyTds: true,
    tdsRate: 2,
    priority: 10,
    isActive: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
];

let globalBillingRules: BillingRule[] = [...DEFAULT_BILLING_RULES];
let globalBillingRecords: CaseBillingRecord[] | null = null;

/* ────────────────────────────────────────────────────────────────────────
 * Rule Matching & Calculation Engine
 * ──────────────────────────────────────────────────────────────────────── */

export interface CaseInputForCalculation {
  accountId: string;
  loanNumber: string;
  customerName: string;
  clientBank: string;
  productType: string;
  bucket: string;
  agencyName: string;
  teamLeaderName: string;
  agentId: string;
  agentName: string;
  resolutionDate: string;
  resolutionAmount: number;
  resolutionType: "full_paid" | "settled" | "partial_recovery";
  agentResolvedCountToDate?: number;
}

export function matchAndCalculateBilling(
  c: CaseInputForCalculation,
  rules: BillingRule[]
): {
  matchedRule: BillingRule;
  calculatedBilling: number;
  rateFormulaApplied: string;
  effectiveRatePct: number;
  gstAmount: number;
  tdsAmount: number;
  netPayable: number;
} {
  const activeRules = rules
    .filter((r) => r.isActive)
    .sort((a, b) => b.priority - a.priority);

  let matchedRule: BillingRule | undefined = activeRules.find(
    (r) =>
      (r.clientBank === "All" || r.clientBank === c.clientBank) &&
      (r.productType === "All" || r.productType === c.productType) &&
      (r.agencyName === "All" || r.agencyName === c.agencyName) &&
      (r.bucket === "All" || r.bucket === c.bucket)
  );

  if (!matchedRule) {
    matchedRule = DEFAULT_BILLING_RULES[DEFAULT_BILLING_RULES.length - 1];
  }

  let calculatedBilling = 0;
  let formula = "";
  const amt = c.resolutionAmount;

  switch (matchedRule.ruleType) {
    case "percentage": {
      calculatedBilling = Math.round((amt * matchedRule.percentageRate) / 100);
      formula = `${matchedRule.percentageRate}% of ₹${amt.toLocaleString("en-IN")}`;
      break;
    }
    case "fixed_per_resolution": {
      calculatedBilling = matchedRule.fixedAmount;
      formula = `Fixed ₹${matchedRule.fixedAmount.toLocaleString("en-IN")} / case`;
      break;
    }
    case "hybrid": {
      const pctPart = Math.round((amt * matchedRule.percentageRate) / 100);
      calculatedBilling = matchedRule.fixedAmount + pctPart;
      formula = `₹${matchedRule.fixedAmount} fixed + ${matchedRule.percentageRate}% (₹${pctPart.toLocaleString("en-IN")})`;
      break;
    }
    case "slab_amount": {
      const slabs = matchedRule.slabAmountConfig || [
        { min: 0, max: 50000, rate: 5.0 },
        { min: 50001, max: 200000, rate: 7.5 },
        { min: 200001, max: 0, rate: 10.0 },
      ];
      const activeSlab =
        slabs.find((s) => amt >= s.min && (s.max === 0 || amt <= s.max)) || slabs[slabs.length - 1];
      calculatedBilling = Math.round((amt * activeSlab.rate) / 100);
      const capText = activeSlab.max > 0 ? `₹${activeSlab.max.toLocaleString("en-IN")}` : "Above";
      formula = `Slab [₹${activeSlab.min.toLocaleString("en-IN")} - ${capText}] @ ${activeSlab.rate}%`;
      break;
    }
    case "slab_count": {
      const slabs = matchedRule.slabCountConfig || [
        { min: 1, max: 15, feePerCase: 450 },
        { min: 16, max: 35, feePerCase: 650 },
        { min: 36, max: 0, feePerCase: 900 },
      ];
      const count = c.agentResolvedCountToDate || 12;
      const activeTier =
        slabs.find((s) => count >= s.min && (s.max === 0 || count <= s.max)) || slabs[slabs.length - 1];
      calculatedBilling = activeTier.feePerCase;
      formula = `Volume Tier #${count} cases @ ₹${activeTier.feePerCase}/case`;
      break;
    }
    case "bucket_tiered": {
      const basePct = matchedRule.percentageRate || 5.0;
      const mult = matchedRule.bucketMultipliers?.[c.bucket] ?? 1.0;
      const effectivePct = Number((basePct * mult).toFixed(2));
      calculatedBilling = Math.round((amt * effectivePct) / 100);
      formula = `${c.bucket} Base ${basePct}% × ${mult}x = ${effectivePct}%`;
      break;
    }
    default: {
      calculatedBilling = Math.round(amt * 0.05);
      formula = `5% standard collection fee`;
    }
  }

  calculatedBilling = Math.max(100, calculatedBilling);

  const effectiveRatePct = amt > 0 ? Number(((calculatedBilling / amt) * 100).toFixed(2)) : 0;
  const gstAmount = matchedRule.applyGst ? Math.round((calculatedBilling * matchedRule.gstRate) / 100) : 0;
  const tdsAmount = matchedRule.applyTds ? Math.round((calculatedBilling * matchedRule.tdsRate) / 100) : 0;
  const netPayable = calculatedBilling + gstAmount - tdsAmount;

  return {
    matchedRule,
    calculatedBilling,
    rateFormulaApplied: formula,
    effectiveRatePct,
    gstAmount,
    tdsAmount,
    netPayable,
  };
}

/* ────────────────────────────────────────────────────────────────────────
 * Master Seed Records Generator
 * ──────────────────────────────────────────────────────────────────────── */

const CLIENT_BANKS = ["HDFC Bank", "ICICI Bank", "SBI Card", "Axis Bank", "Kotak Mahindra Bank", "Bajaj Finance"];
const PRODUCTS = ["Credit Cards", "Personal Loans", "Auto Loans", "Two Wheeler Loans", "Business Loans", "Microfinance"];
const AGENCIES = [
  { name: "Apex Recovery Services", code: "APEX" },
  { name: "Stellar Asset Management", code: "STEL" },
  { name: "Alpha Financial Solutions", code: "ALPH" },
  { name: "Nexus Credit Care", code: "NEXS" },
];

const TEAM_LEADERS = [
  { name: "Rajesh Kumar", agency: "Apex Recovery Services" },
  { name: "Priya Sharma", agency: "Apex Recovery Services" },
  { name: "Amit Patel", agency: "Stellar Asset Management" },
  { name: "Sneha Verma", agency: "Alpha Financial Solutions" },
  { name: "Vikram Rathore", agency: "Nexus Credit Care" },
];

const AGENTS = [
  { id: "ag-101", name: "Rohit Verma", tl: "Rajesh Kumar", agency: "Apex Recovery Services" },
  { id: "ag-102", name: "Anjali Rao", tl: "Rajesh Kumar", agency: "Apex Recovery Services" },
  { id: "ag-103", name: "Suresh Nair", tl: "Priya Sharma", agency: "Apex Recovery Services" },
  { id: "ag-104", name: "Neha Gupta", tl: "Priya Sharma", agency: "Apex Recovery Services" },
  { id: "ag-105", name: "Manoj Tiwari", tl: "Amit Patel", agency: "Stellar Asset Management" },
  { id: "ag-106", name: "Deepak Soni", tl: "Amit Patel", agency: "Stellar Asset Management" },
  { id: "ag-107", name: "Kavita Singh", tl: "Sneha Verma", agency: "Alpha Financial Solutions" },
  { id: "ag-108", name: "Ramesh Iyer", tl: "Sneha Verma", agency: "Alpha Financial Solutions" },
  { id: "ag-109", name: "Sunil Joshi", tl: "Vikram Rathore", agency: "Nexus Credit Care" },
  { id: "ag-110", name: "Pooja Mishra", tl: "Vikram Rathore", agency: "Nexus Credit Care" },
];

const FIRST_NAMES = [
  "Aarav", "Aditi", "Akhil", "Arjun", "Bhavna", "Chetan", "Divya", "Gaurav", "Harish", "Ishaan",
  "Jaspreet", "Karan", "Kunal", "Lalit", "Manish", "Nikhil", "Pooja", "Pranav", "Radhika", "Rohan",
  "Sachin", "Sameer", "Sanjay", "Shreya", "Siddharth", "Tarun", "Varun", "Vikas", "Yash", "Zoya",
  "Meera", "Ananya", "Ritu", "Akash", "Vivek", "Kiran", "Naveen", "Preeti", "Umesh", "Dinesh"
];

const LAST_NAMES = [
  "Sharma", "Verma", "Patel", "Reddy", "Mehta", "Deshmukh", "Chopra", "Chauhan", "Bhatia", "Saxena",
  "Nair", "Pillai", "Iyer", "Banerjee", "Chatterjee", "Mishra", "Pandey", "Yadav", "Trivedi", "Joshi",
  "Kapoor", "Malhotra", "Khanna", "Goyal", "Agarwal", "Bansal", "Singhania", "Rao", "Shetty", "Kulkarni"
];

const BUCKETS = ["B1", "B2", "B3", "B4", "B5", "B6_PLUS"];

function generateInitialBillingRecords(): CaseBillingRecord[] {
  if (globalBillingRecords) return globalBillingRecords;

  const records: CaseBillingRecord[] = [];
  const today = new Date();
  let caseIdCounter = 2000;

  AGENTS.forEach((agent, agentIdx) => {
    const resolvedCount = 16 + (agentIdx % 4) * 3;

    for (let i = 0; i < resolvedCount; i++) {
      caseIdCounter++;
      const custFn = FIRST_NAMES[(caseIdCounter + i) % FIRST_NAMES.length];
      const custLn = LAST_NAMES[(caseIdCounter * 3 + i) % LAST_NAMES.length];
      const customerName = `${custFn} ${custLn}`;
      const bank = CLIENT_BANKS[(caseIdCounter + agentIdx) % CLIENT_BANKS.length];
      const product = PRODUCTS[(caseIdCounter * 2 + i) % PRODUCTS.length];
      const bucket = BUCKETS[(caseIdCounter + i) % BUCKETS.length];
      const loanNumber = `LN-${bank.slice(0, 3).toUpperCase()}-${caseIdCounter}`;

      const daysAgo = (caseIdCounter * 17) % 30;
      const resDateObj = new Date(today);
      resDateObj.setDate(today.getDate() - daysAgo);
      const resolutionDate = resDateObj.toISOString().slice(0, 10);

      const recoveryBase = 18000 + ((caseIdCounter * 4391) % 285000);
      const resolutionAmount = Math.round(recoveryBase / 500) * 500;

      const resTypeRoll = (caseIdCounter + i) % 10;
      const resolutionType: "full_paid" | "settled" | "partial_recovery" =
        resTypeRoll < 5 ? "settled" : resTypeRoll < 8 ? "full_paid" : "partial_recovery";

      const calcResult = matchAndCalculateBilling(
        {
          accountId: `acc-${caseIdCounter}`,
          loanNumber,
          customerName,
          clientBank: bank,
          productType: product,
          bucket,
          agencyName: agent.agency,
          teamLeaderName: agent.tl,
          agentId: agent.id,
          agentName: agent.name,
          resolutionDate,
          resolutionAmount,
          resolutionType,
          agentResolvedCountToDate: i + 1,
        },
        globalBillingRules
      );

      let approvalStatus: BillingApprovalStatus = "approved";
      let paymentStatus: BillingPaymentStatus = "paid";
      let paymentRef: string | undefined = `UTR-CMS-${20260000 + caseIdCounter}`;
      let paymentDate: string | undefined = resolutionDate;
      let approvedBy: string | undefined = "Finance Ops Manager";
      let approvedAt: string | undefined = `${resolutionDate}T16:00:00Z`;

      if (daysAgo < 3) {
        approvalStatus = "pending_approval";
        paymentStatus = "unpaid";
        paymentRef = undefined;
        paymentDate = undefined;
        approvedBy = undefined;
        approvedAt = undefined;
      } else if (daysAgo < 8) {
        approvalStatus = "approved";
        paymentStatus = (caseIdCounter % 3 === 0) ? "processing" : "unpaid";
        paymentRef = paymentStatus === "processing" ? `BAT-PROC-${caseIdCounter}` : undefined;
        paymentDate = undefined;
      } else if (caseIdCounter % 29 === 0) {
        approvalStatus = "disputed";
        paymentStatus = "unpaid";
        paymentRef = undefined;
        paymentDate = undefined;
      } else if (caseIdCounter % 37 === 0) {
        approvalStatus = "held";
        paymentStatus = "unpaid";
        paymentRef = undefined;
        paymentDate = undefined;
      }

      const incentiveBonus = (caseIdCounter % 7 === 0) ? Math.round(calcResult.calculatedBilling * 0.1) : 0;
      const approvedBilling =
        approvalStatus === "approved"
          ? calcResult.calculatedBilling + incentiveBonus
          : calcResult.calculatedBilling;

      const recordId = `bill-${caseIdCounter}`;

      const auditLogs: BillingAuditEntry[] = [
        {
          timestamp: `${resolutionDate}T11:30:00Z`,
          action: "RULE_MATCHED_AND_CALCULATED",
          performedBy: "Automated Billing Engine",
          details: `Applied rule '${calcResult.matchedRule.name}' (${calcResult.rateFormulaApplied}) yielding ₹${calcResult.calculatedBilling.toLocaleString("en-IN")}`,
          newAmount: calcResult.calculatedBilling,
          newStatus: "pending_approval",
        },
      ];

      if (approvalStatus === "approved") {
        auditLogs.push({
          timestamp: approvedAt || `${resolutionDate}T16:00:00Z`,
          action: "BILLING_APPROVED",
          performedBy: approvedBy || "Bank Client Relationship Team",
          details: `Approved for payout. Incentive bonus: ₹${incentiveBonus}`,
          previousAmount: calcResult.calculatedBilling,
          newAmount: approvedBilling,
          previousStatus: "pending_approval",
          newStatus: "approved",
        });
      }

      if (paymentStatus === "paid") {
        auditLogs.push({
          timestamp: `${resolutionDate}T18:45:00Z`,
          action: "PAYOUT_DISBURSED",
          performedBy: "Treasury Direct Settlement",
          details: `Disbursed to agency commercial account via NEFT/CMS with UTR: ${paymentRef}`,
          newStatus: "paid",
        });
      } else if (approvalStatus === "held") {
        auditLogs.push({
          timestamp: `${resolutionDate}T14:10:00Z`,
          action: "BILLING_HELD",
          performedBy: "Audit & Compliance Team",
          reason: "Borrower settlement letter reconciliation pending bank NOC sign-off",
          newStatus: "held",
        });
      }

      records.push({
        id: recordId,
        accountId: `acc-${caseIdCounter}`,
        loanNumber,
        customerName,
        clientBank: bank,
        productType: product,
        bucket,
        agencyName: agent.agency,
        teamLeaderName: agent.tl,
        agentId: agent.id,
        agentName: agent.name,
        resolutionDate,
        resolutionAmount,
        resolutionType,
        matchedRuleId: calcResult.matchedRule.id,
        matchedRuleName: calcResult.matchedRule.name,
        ruleTypeApplied: calcResult.matchedRule.ruleType,
        rateFormulaApplied: calcResult.rateFormulaApplied,
        effectiveRatePct: calcResult.effectiveRatePct,
        calculatedBilling: calcResult.calculatedBilling,
        incentiveBonus,
        deductions: 0,
        approvedBilling,
        gstAmount: calcResult.gstAmount,
        tdsAmount: calcResult.tdsAmount,
        netPayable: calcResult.netPayable,
        approvalStatus,
        paymentStatus,
        paymentReference: paymentRef,
        paymentDate,
        notes: `Settled on ${resolutionDate} via ${resolutionType.replace("_", " ").toUpperCase()}`,
        approvedBy,
        approvedAt,
        auditLogs,
      });
    }
  });

  globalBillingRecords = records;
  return records;
}

/* ────────────────────────────────────────────────────────────────────────
 * Public Retrieval & Hierarchy Aggregation Service
 * ──────────────────────────────────────────────────────────────────────── */

export async function getBillingWorkspaceData(filters: BillingFilterState = {}): Promise<BillingWorkspaceData> {
  const allRecords = generateInitialBillingRecords();

  const filtered = allRecords.filter((r) => {
    if (filters.bank && filters.bank !== "all" && r.clientBank !== filters.bank) return false;
    if (filters.product && filters.product !== "all" && r.productType !== filters.product) return false;
    if (filters.agency && filters.agency !== "all" && r.agencyName !== filters.agency) return false;
    if (filters.teamLeader && filters.teamLeader !== "all" && r.teamLeaderName !== filters.teamLeader) return false;
    if (filters.agentId && filters.agentId !== "all" && r.agentId !== filters.agentId) return false;
    if (filters.bucket && filters.bucket !== "all" && r.bucket !== filters.bucket) return false;
    if (filters.approvalStatus && filters.approvalStatus !== "all" && r.approvalStatus !== filters.approvalStatus)
      return false;
    if (filters.paymentStatus && filters.paymentStatus !== "all" && r.paymentStatus !== filters.paymentStatus)
      return false;

    if (filters.datePreset && filters.datePreset !== "all") {
      const today = new Date();
      const recDate = new Date(r.resolutionDate);
      if (filters.datePreset === "today") {
        const todayStr = today.toISOString().slice(0, 10);
        if (r.resolutionDate !== todayStr) return false;
      } else if (filters.datePreset === "yesterday") {
        const yest = new Date(today);
        yest.setDate(today.getDate() - 1);
        if (r.resolutionDate !== yest.toISOString().slice(0, 10)) return false;
      } else if (filters.datePreset === "last7") {
        const d7 = new Date(today);
        d7.setDate(today.getDate() - 7);
        if (recDate < d7) return false;
      } else if (filters.datePreset === "last30") {
        const d30 = new Date(today);
        d30.setDate(today.getDate() - 30);
        if (recDate < d30) return false;
      } else if (filters.datePreset === "this_month") {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        if (recDate < monthStart) return false;
      } else if (filters.datePreset === "last_month") {
        const lMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        if (recDate < lMonthStart || recDate > lMonthEnd) return false;
      }
    }

    if (filters.dateFrom && r.resolutionDate < filters.dateFrom) return false;
    if (filters.dateTo && r.resolutionDate > filters.dateTo) return false;

    if (filters.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase().trim();
      const match =
        r.loanNumber.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        r.clientBank.toLowerCase().includes(q) ||
        r.productType.toLowerCase().includes(q) ||
        r.agencyName.toLowerCase().includes(q) ||
        r.agentName.toLowerCase().includes(q) ||
        r.matchedRuleName.toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });

  const totalResolutions = filtered.length;
  const totalResolutionAmount = filtered.reduce((s, r) => s + r.resolutionAmount, 0);
  const totalGeneratedBilling = filtered.reduce((s, r) => s + r.calculatedBilling, 0);
  const approvedBillingAmount = filtered
    .filter((r) => r.approvalStatus === "approved")
    .reduce((s, r) => s + r.approvedBilling, 0);
  const pendingApprovalAmount = filtered
    .filter((r) => r.approvalStatus === "pending_approval")
    .reduce((s, r) => s + r.calculatedBilling, 0);
  const paidPayoutAmount = filtered
    .filter((r) => r.paymentStatus === "paid")
    .reduce((s, r) => s + r.approvedBilling, 0);
  const unpaidPayoutAmount = filtered
    .filter((r) => r.paymentStatus === "unpaid")
    .reduce((s, r) => s + r.approvedBilling, 0);
  const heldBillingAmount = filtered
    .filter((r) => r.approvalStatus === "held")
    .reduce((s, r) => s + r.calculatedBilling, 0);

  const effectiveBillingYieldPct =
    totalResolutionAmount > 0
      ? Number(((totalGeneratedBilling / totalResolutionAmount) * 100).toFixed(2))
      : 0;

  const avgBillingPerResolution =
    totalResolutions > 0 ? Math.round(totalGeneratedBilling / totalResolutions) : 0;

  const agencyMap = new Map<string, number>();
  filtered.forEach((r) => agencyMap.set(r.agencyName, (agencyMap.get(r.agencyName) || 0) + r.calculatedBilling));
  let highestBillingAgency = { name: "N/A", amount: 0 };
  agencyMap.forEach((amt, name) => {
    if (amt > highestBillingAgency.amount) highestBillingAgency = { name, amount: amt };
  });

  const agentMap = new Map<string, { name: string; amount: number; count: number }>();
  filtered.forEach((r) => {
    const entry = agentMap.get(r.agentId) || { name: r.agentName, amount: 0, count: 0 };
    entry.amount += r.calculatedBilling;
    entry.count += 1;
    agentMap.set(r.agentId, entry);
  });
  let topEarningAgent = { name: "N/A", amount: 0, resolutions: 0 };
  agentMap.forEach((item) => {
    if (item.amount > topEarningAgent.amount) {
      topEarningAgent = { name: item.name, amount: item.amount, resolutions: item.count };
    }
  });

  const kpis: BillingKpis = {
    totalResolutions,
    totalResolutionAmount,
    totalGeneratedBilling,
    effectiveBillingYieldPct,
    approvedBillingAmount,
    pendingApprovalAmount,
    paidPayoutAmount,
    unpaidPayoutAmount,
    heldBillingAmount,
    avgBillingPerResolution,
    highestBillingAgency,
    topEarningAgent,
  };

  const hierarchy = buildBillingHierarchy(filtered);
  const reports = buildBillingReports(filtered);

  return {
    filters,
    filterOptions: {
      banks: CLIENT_BANKS,
      products: PRODUCTS,
      agencies: AGENCIES.map((a) => a.name),
      teamLeaders: TEAM_LEADERS.map((t) => t.name),
      agents: AGENTS.map((a) => ({ id: a.id, name: a.name })),
      buckets: BUCKETS,
      approvalStatuses: ["pending_approval", "approved", "disputed", "held"],
      paymentStatuses: ["unpaid", "processing", "paid"],
    },
    kpis,
    rules: globalBillingRules,
    hierarchy,
    reports,
    allRecords: filtered,
  };
}

function buildBillingHierarchy(records: CaseBillingRecord[]): DrilldownHierarchyItem[] {
  const bankMap = new Map<string, CaseBillingRecord[]>();
  records.forEach((r) => {
    const list = bankMap.get(r.clientBank) || [];
    list.push(r);
    bankMap.set(r.clientBank, list);
  });

  const hierarchy: DrilldownHierarchyItem[] = [];

  bankMap.forEach((bankRecords, bankName) => {
    const productMap = new Map<string, CaseBillingRecord[]>();
    bankRecords.forEach((r) => {
      const list = productMap.get(r.productType) || [];
      list.push(r);
      productMap.set(r.productType, list);
    });

    const productChildren: DrilldownHierarchyItem[] = [];

    productMap.forEach((prodRecords, prodName) => {
      const agencyMap = new Map<string, CaseBillingRecord[]>();
      prodRecords.forEach((r) => {
        const list = agencyMap.get(r.agencyName) || [];
        list.push(r);
        agencyMap.set(r.agencyName, list);
      });

      const agencyChildren: DrilldownHierarchyItem[] = [];

      agencyMap.forEach((agRecords, agName) => {
        const tlMap = new Map<string, CaseBillingRecord[]>();
        agRecords.forEach((r) => {
          const list = tlMap.get(r.teamLeaderName) || [];
          list.push(r);
          tlMap.set(r.teamLeaderName, list);
        });

        const tlChildren: DrilldownHierarchyItem[] = [];

        tlMap.forEach((tlRecords, tlName) => {
          const agentMap = new Map<string, CaseBillingRecord[]>();
          tlRecords.forEach((r) => {
            const list = agentMap.get(r.agentName) || [];
            list.push(r);
            agentMap.set(r.agentName, list);
          });

          const agentChildren: DrilldownHierarchyItem[] = [];

          agentMap.forEach((agentRecords, agentName) => {
            const agResAmt = agentRecords.reduce((s, r) => s + r.resolutionAmount, 0);
            const agGenBill = agentRecords.reduce((s, r) => s + r.calculatedBilling, 0);
            const agAppBill = agentRecords
              .filter((r) => r.approvalStatus === "approved")
              .reduce((s, r) => s + r.approvedBilling, 0);
            const agPaid = agentRecords
              .filter((r) => r.paymentStatus === "paid")
              .reduce((s, r) => s + r.approvedBilling, 0);
            const agYield = agResAmt > 0 ? Number(((agGenBill / agResAmt) * 100).toFixed(2)) : 0;

            const primaryRule = agentRecords[0]?.matchedRuleName || "Standard Rule";
            const primaryRate = agentRecords[0]?.rateFormulaApplied || `${agYield}%`;

            agentChildren.push({
              id: `ag-${agentRecords[0]?.agentId || agentName}`,
              name: agentName,
              level: "agent",
              resolvedCasesCount: agentRecords.length,
              resolutionAmount: agResAmt,
              applicableRuleName: primaryRule,
              applicableRateText: primaryRate,
              generatedBilling: agGenBill,
              approvedBilling: agAppBill,
              paidPayout: agPaid,
              effectiveYieldPct: agYield,
              caseRecords: agentRecords,
            });
          });

          agentChildren.sort((a, b) => b.generatedBilling - a.generatedBilling);

          const tlResAmt = tlRecords.reduce((s, r) => s + r.resolutionAmount, 0);
          const tlGenBill = tlRecords.reduce((s, r) => s + r.calculatedBilling, 0);
          const tlAppBill = tlRecords
            .filter((r) => r.approvalStatus === "approved")
            .reduce((s, r) => s + r.approvedBilling, 0);
          const tlPaid = tlRecords
            .filter((r) => r.paymentStatus === "paid")
            .reduce((s, r) => s + r.approvedBilling, 0);
          const tlYield = tlResAmt > 0 ? Number(((tlGenBill / tlResAmt) * 100).toFixed(2)) : 0;

          tlChildren.push({
            id: `tl-${tlName}`,
            name: tlName,
            level: "tl",
            resolvedCasesCount: tlRecords.length,
            resolutionAmount: tlResAmt,
            applicableRuleName: `${agentChildren.length} Agents Assigned`,
            applicableRateText: `Avg ${tlYield}%`,
            generatedBilling: tlGenBill,
            approvedBilling: tlAppBill,
            paidPayout: tlPaid,
            effectiveYieldPct: tlYield,
            children: agentChildren,
          });
        });

        tlChildren.sort((a, b) => b.generatedBilling - a.generatedBilling);

        const agTotResAmt = agRecords.reduce((s, r) => s + r.resolutionAmount, 0);
        const agTotGenBill = agRecords.reduce((s, r) => s + r.calculatedBilling, 0);
        const agTotAppBill = agRecords
          .filter((r) => r.approvalStatus === "approved")
          .reduce((s, r) => s + r.approvedBilling, 0);
        const agTotPaid = agRecords
          .filter((r) => r.paymentStatus === "paid")
          .reduce((s, r) => s + r.approvedBilling, 0);
        const agTotYield = agTotResAmt > 0 ? Number(((agTotGenBill / agTotResAmt) * 100).toFixed(2)) : 0;

        agencyChildren.push({
          id: `agency-${agName}`,
          name: agName,
          level: "agency",
          resolvedCasesCount: agRecords.length,
          resolutionAmount: agTotResAmt,
          applicableRuleName: `${tlChildren.length} TL Teams Active`,
          applicableRateText: `Effective ${agTotYield}%`,
          generatedBilling: agTotGenBill,
          approvedBilling: agTotAppBill,
          paidPayout: agTotPaid,
          effectiveYieldPct: agTotYield,
          children: tlChildren,
        });
      });

      agencyChildren.sort((a, b) => b.generatedBilling - a.generatedBilling);

      const prTotResAmt = prodRecords.reduce((s, r) => s + r.resolutionAmount, 0);
      const prTotGenBill = prodRecords.reduce((s, r) => s + r.calculatedBilling, 0);
      const prTotAppBill = prodRecords
        .filter((r) => r.approvalStatus === "approved")
        .reduce((s, r) => s + r.approvedBilling, 0);
      const prTotPaid = prodRecords
        .filter((r) => r.paymentStatus === "paid")
        .reduce((s, r) => s + r.approvedBilling, 0);
      const prTotYield = prTotResAmt > 0 ? Number(((prTotGenBill / prTotResAmt) * 100).toFixed(2)) : 0;

      productChildren.push({
        id: `prod-${bankName}-${prodName}`,
        name: prodName,
        level: "product",
        resolvedCasesCount: prodRecords.length,
        resolutionAmount: prTotResAmt,
        applicableRuleName: prodRecords[0]?.matchedRuleName || "Product Payout Rule",
        applicableRateText: `${prTotYield}% Yield`,
        generatedBilling: prTotGenBill,
        approvedBilling: prTotAppBill,
        paidPayout: prTotPaid,
        effectiveYieldPct: prTotYield,
        children: agencyChildren,
      });
    });

    productChildren.sort((a, b) => b.generatedBilling - a.generatedBilling);

    const bankTotResAmt = bankRecords.reduce((s, r) => s + r.resolutionAmount, 0);
    const bankTotGenBill = bankRecords.reduce((s, r) => s + r.calculatedBilling, 0);
    const bankTotAppBill = bankRecords
      .filter((r) => r.approvalStatus === "approved")
      .reduce((s, r) => s + r.approvedBilling, 0);
    const bankTotPaid = bankRecords
      .filter((r) => r.paymentStatus === "paid")
      .reduce((s, r) => s + r.approvedBilling, 0);
    const bankTotYield = bankTotResAmt > 0 ? Number(((bankTotGenBill / bankTotResAmt) * 100).toFixed(2)) : 0;

    hierarchy.push({
      id: `bank-${bankName}`,
      name: bankName,
      level: "bank",
      resolvedCasesCount: bankRecords.length,
      resolutionAmount: bankTotResAmt,
      applicableRuleName: `${productChildren.length} Product Portfolios`,
      applicableRateText: `Effective ${bankTotYield}%`,
      generatedBilling: bankTotGenBill,
      approvedBilling: bankTotAppBill,
      paidPayout: bankTotPaid,
      effectiveYieldPct: bankTotYield,
      children: productChildren,
    });
  });

  hierarchy.sort((a, b) => b.generatedBilling - a.generatedBilling);
  return hierarchy;
}

function buildBillingReports(records: CaseBillingRecord[]): BillingReportsData {
  // 1. Bank-wise
  const bankMap = new Map<string, CaseBillingRecord[]>();
  records.forEach((r) => {
    const list = bankMap.get(r.clientBank) || [];
    list.push(r);
    bankMap.set(r.clientBank, list);
  });
  const bankWise: BankBillingReportRow[] = [];
  bankMap.forEach((list, bank) => {
    const col = list.reduce((s, r) => s + r.resolutionAmount, 0);
    const gen = list.reduce((s, r) => s + r.calculatedBilling, 0);
    const app = list.filter((r) => r.approvalStatus === "approved").reduce((s, r) => s + r.approvedBilling, 0);
    const paid = list.filter((r) => r.paymentStatus === "paid").reduce((s, r) => s + r.approvedBilling, 0);
    const unpaid = list.filter((r) => r.paymentStatus === "unpaid").reduce((s, r) => s + r.approvedBilling, 0);
    bankWise.push({
      bank,
      resolutionCount: list.length,
      collectionAmount: col,
      generatedBilling: gen,
      approvedBilling: app,
      paidPayout: paid,
      unpaidPayout: unpaid,
      effectiveRate: col > 0 ? Number(((gen / col) * 100).toFixed(2)) : 0,
      activeRule: list[0]?.matchedRuleName || "Standard Agreement",
    });
  });
  bankWise.sort((a, b) => b.generatedBilling - a.generatedBilling);

  // 2. Product-wise
  const prodMap = new Map<string, CaseBillingRecord[]>();
  records.forEach((r) => {
    const list = prodMap.get(r.productType) || [];
    list.push(r);
    prodMap.set(r.productType, list);
  });
  const productWise: ProductBillingReportRow[] = [];
  prodMap.forEach((list, product) => {
    const col = list.reduce((s, r) => s + r.resolutionAmount, 0);
    const gen = list.reduce((s, r) => s + r.calculatedBilling, 0);
    const app = list.filter((r) => r.approvalStatus === "approved").reduce((s, r) => s + r.approvedBilling, 0);
    productWise.push({
      product,
      resolutionCount: list.length,
      collectionAmount: col,
      generatedBilling: gen,
      approvedBilling: app,
      effectiveRate: col > 0 ? Number(((gen / col) * 100).toFixed(2)) : 0,
    });
  });
  productWise.sort((a, b) => b.generatedBilling - a.generatedBilling);

  // 3. Agency-wise
  const agencyMap = new Map<string, CaseBillingRecord[]>();
  records.forEach((r) => {
    const list = agencyMap.get(r.agencyName) || [];
    list.push(r);
    agencyMap.set(r.agencyName, list);
  });
  const agencyWise: AgencyBillingReportRow[] = [];
  agencyMap.forEach((list, agency) => {
    const col = list.reduce((s, r) => s + r.resolutionAmount, 0);
    const gen = list.reduce((s, r) => s + r.calculatedBilling, 0);
    const app = list.filter((r) => r.approvalStatus === "approved").reduce((s, r) => s + r.approvedBilling, 0);
    const paid = list.filter((r) => r.paymentStatus === "paid").reduce((s, r) => s + r.approvedBilling, 0);
    const pending = list.filter((r) => r.paymentStatus !== "paid").reduce((s, r) => s + r.approvedBilling, 0);
    const net = list.reduce((s, r) => s + r.netPayable, 0);
    agencyWise.push({
      agency,
      resolutionCount: list.length,
      collectionAmount: col,
      generatedBilling: gen,
      approvedBilling: app,
      paidPayout: paid,
      pendingPayout: pending,
      netPayableAfterTds: net,
    });
  });
  agencyWise.sort((a, b) => b.generatedBilling - a.generatedBilling);

  // 4. TL-wise
  const tlMap = new Map<string, CaseBillingRecord[]>();
  records.forEach((r) => {
    const list = tlMap.get(r.teamLeaderName) || [];
    list.push(r);
    tlMap.set(r.teamLeaderName, list);
  });
  const tlWise: TLBillingReportRow[] = [];
  tlMap.forEach((list, teamLeader) => {
    const col = list.reduce((s, r) => s + r.resolutionAmount, 0);
    const gen = list.reduce((s, r) => s + r.calculatedBilling, 0);
    const app = list.filter((r) => r.approvalStatus === "approved").reduce((s, r) => s + r.approvedBilling, 0);
    const agentsInTeam = new Set(list.map((r) => r.agentId)).size;
    tlWise.push({
      teamLeader,
      agency: list[0]?.agencyName || "N/A",
      agentCount: agentsInTeam,
      resolutionCount: list.length,
      collectionAmount: col,
      generatedBilling: gen,
      approvedBilling: app,
    });
  });
  tlWise.sort((a, b) => b.generatedBilling - a.generatedBilling);

  // 5. Agent-wise
  const agMap = new Map<string, CaseBillingRecord[]>();
  records.forEach((r) => {
    const list = agMap.get(r.agentId) || [];
    list.push(r);
    agMap.set(r.agentId, list);
  });
  const agentWise: AgentBillingReportRow[] = [];
  agMap.forEach((list, agentId) => {
    const col = list.reduce((s, r) => s + r.resolutionAmount, 0);
    const gen = list.reduce((s, r) => s + r.calculatedBilling, 0);
    const app = list.filter((r) => r.approvalStatus === "approved").reduce((s, r) => s + r.approvedBilling, 0);
    const paid = list.filter((r) => r.paymentStatus === "paid").reduce((s, r) => s + r.approvedBilling, 0);
    agentWise.push({
      agentId,
      agentName: list[0]?.agentName || "Agent",
      agency: list[0]?.agencyName || "Agency",
      teamLeader: list[0]?.teamLeaderName || "TL",
      resolutionCount: list.length,
      collectionAmount: col,
      applicableRate: list[0]?.rateFormulaApplied || "Tiered",
      generatedBilling: gen,
      approvedBilling: app,
      paidAmount: paid,
      paymentStatus: paid === app && app > 0 ? "Fully Paid" : paid > 0 ? "Partially Paid" : "Pending Payout",
    });
  });
  agentWise.sort((a, b) => b.generatedBilling - a.generatedBilling);

  // 6. Daily Timeline
  const dailyMap = new Map<string, CaseBillingRecord[]>();
  records.forEach((r) => {
    const list = dailyMap.get(r.resolutionDate) || [];
    list.push(r);
    dailyMap.set(r.resolutionDate, list);
  });
  const dailyTimeline: DailyBillingPoint[] = [];
  dailyMap.forEach((list, date) => {
    dailyTimeline.push({
      date,
      resolutions: list.length,
      collectionAmount: list.reduce((s, r) => s + r.resolutionAmount, 0),
      billingGenerated: list.reduce((s, r) => s + r.calculatedBilling, 0),
      approvedBilling: list.filter((r) => r.approvalStatus === "approved").reduce((s, r) => s + r.approvedBilling, 0),
    });
  });
  dailyTimeline.sort((a, b) => a.date.localeCompare(b.date));

  // 7. Monthly Trend
  const monthlyMap = new Map<string, CaseBillingRecord[]>();
  records.forEach((r) => {
    const monthKey = r.resolutionDate.slice(0, 7);
    const list = monthlyMap.get(monthKey) || [];
    list.push(r);
    monthlyMap.set(monthKey, list);
  });
  const monthlyTrend: MonthlyBillingPoint[] = [];
  monthlyMap.forEach((list, month) => {
    monthlyTrend.push({
      month,
      resolutions: list.length,
      collectionAmount: list.reduce((s, r) => s + r.resolutionAmount, 0),
      billingGenerated: list.reduce((s, r) => s + r.calculatedBilling, 0),
      approvedBilling: list.filter((r) => r.approvalStatus === "approved").reduce((s, r) => s + r.approvedBilling, 0),
      paidPayout: list.filter((r) => r.paymentStatus === "paid").reduce((s, r) => s + r.approvedBilling, 0),
    });
  });
  monthlyTrend.sort((a, b) => a.month.localeCompare(b.month));

  // 8. Pending vs Approved
  const pendingRecs = records.filter((r) => r.approvalStatus === "pending_approval");
  const approvedRecs = records.filter((r) => r.approvalStatus === "approved");
  const heldRecs = records.filter((r) => r.approvalStatus === "held");
  const disputedRecs = records.filter((r) => r.approvalStatus === "disputed");

  const pendingVsApproved = {
    pendingCount: pendingRecs.length,
    pendingAmount: pendingRecs.reduce((s, r) => s + r.calculatedBilling, 0),
    approvedCount: approvedRecs.length,
    approvedAmount: approvedRecs.reduce((s, r) => s + r.approvedBilling, 0),
    heldCount: heldRecs.length,
    heldAmount: heldRecs.reduce((s, r) => s + r.calculatedBilling, 0),
    disputedCount: disputedRecs.length,
    disputedAmount: disputedRecs.reduce((s, r) => s + r.calculatedBilling, 0),
  };

  // 9. Paid vs Unpaid
  const paidRecs = records.filter((r) => r.paymentStatus === "paid");
  const procRecs = records.filter((r) => r.paymentStatus === "processing");
  const unpaidRecs = records.filter((r) => r.paymentStatus === "unpaid");

  const paidVsUnpaid = {
    paidCount: paidRecs.length,
    paidAmount: paidRecs.reduce((s, r) => s + r.approvedBilling, 0),
    processingCount: procRecs.length,
    processingAmount: procRecs.reduce((s, r) => s + r.approvedBilling, 0),
    unpaidCount: unpaidRecs.length,
    unpaidAmount: unpaidRecs.reduce((s, r) => s + r.approvedBilling, 0),
  };

  return {
    bankWise,
    productWise,
    agencyWise,
    tlWise,
    agentWise,
    resolutionWise: records.slice(0, 100),
    dailyTimeline,
    monthlyTrend,
    pendingVsApproved,
    paidVsUnpaid,
  };
}

export function saveBillingRule(rule: Partial<BillingRule> & { name: string; ruleType: BillingRuleType }): {
  success: boolean;
  rule: BillingRule;
} {
  const existingIdx = globalBillingRules.findIndex((r) => r.id === rule.id);
  const now = new Date().toISOString();

  if (existingIdx >= 0) {
    const updated: BillingRule = {
      ...globalBillingRules[existingIdx],
      ...rule,
      updatedAt: now,
    };
    globalBillingRules[existingIdx] = updated;
    return { success: true, rule: updated };
  } else {
    const newRule: BillingRule = {
      id: rule.id || `rule-custom-${Date.now()}`,
      name: rule.name,
      description: rule.description || "Custom commercial payout rule",
      ruleType: rule.ruleType,
      clientBank: rule.clientBank || "All",
      productType: rule.productType || "All",
      bucket: rule.bucket || "All",
      agencyName: rule.agencyName || "All",
      percentageRate: rule.percentageRate || 0,
      fixedAmount: rule.fixedAmount || 0,
      slabAmountConfig: rule.slabAmountConfig,
      slabCountConfig: rule.slabCountConfig,
      bucketMultipliers: rule.bucketMultipliers,
      minRecoveryThreshold: rule.minRecoveryThreshold || 0,
      bonusRate: rule.bonusRate || 0,
      applyGst: rule.applyGst ?? true,
      gstRate: rule.gstRate || 18,
      applyTds: rule.applyTds ?? true,
      tdsRate: rule.tdsRate || 2,
      priority: rule.priority || 50,
      isActive: rule.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };
    globalBillingRules.unshift(newRule);
    return { success: true, rule: newRule };
  }
}

export function deleteBillingRule(ruleId: string): { success: boolean } {
  globalBillingRules = globalBillingRules.filter((r) => r.id !== ruleId);
  return { success: true };
}

export function toggleBillingRule(ruleId: string, isActive: boolean): { success: boolean } {
  const target = globalBillingRules.find((r) => r.id === ruleId);
  if (target) {
    target.isActive = isActive;
    target.updatedAt = new Date().toISOString();
    return { success: true };
  }
  return { success: false };
}

export function updateBillingStatus(
  billingId: string,
  approvalStatus: BillingApprovalStatus,
  paymentStatus?: BillingPaymentStatus,
  paymentRef?: string,
  notes?: string,
  approverName?: string
): { success: boolean; record: CaseBillingRecord | null } {
  const all = generateInitialBillingRecords();
  const rec = all.find((r) => r.id === billingId);
  if (!rec) return { success: false, record: null };

  const now = new Date().toISOString();
  const prevApproval = rec.approvalStatus;
  const prevPayment = rec.paymentStatus;

  rec.approvalStatus = approvalStatus;
  if (paymentStatus) rec.paymentStatus = paymentStatus;
  if (paymentRef) rec.paymentReference = paymentRef;
  if (notes) rec.notes = notes;
  if (approvalStatus === "approved" && !rec.approvedBy) {
    rec.approvedBy = approverName || "Authorized Bank Manager";
    rec.approvedAt = now;
  }

  rec.auditLogs.push({
    timestamp: now,
    action: `STATUS_UPDATED_TO_${approvalStatus.toUpperCase()}`,
    performedBy: approverName || "Operations Lead",
    previousStatus: `${prevApproval} / ${prevPayment}`,
    newStatus: `${approvalStatus} / ${rec.paymentStatus}`,
    reason: notes,
    details: paymentRef ? `Payment Reference registered: ${paymentRef}` : undefined,
  });

  return { success: true, record: rec };
}

export function bulkApproveBilling(
  billingIds: string[],
  approverName: string = "Finance Operations Lead"
): { success: boolean; count: number } {
  const all = generateInitialBillingRecords();
  let count = 0;
  const now = new Date().toISOString();

  billingIds.forEach((id) => {
    const rec = all.find((r) => r.id === id);
    if (rec && rec.approvalStatus !== "approved") {
      rec.approvalStatus = "approved";
      rec.approvedBy = approverName;
      rec.approvedAt = now;
      rec.auditLogs.push({
        timestamp: now,
        action: "BULK_BILLING_APPROVED",
        performedBy: approverName,
        details: "Bulk approved from Billing Operations Review Queue",
        previousStatus: "pending_approval",
        newStatus: "approved",
      });
      count++;
    }
  });

  return { success: true, count };
}

export function recalculateAllBilling(): { success: boolean; updatedCount: number } {
  const all = generateInitialBillingRecords();
  let updatedCount = 0;

  all.forEach((rec) => {
    if (rec.approvalStatus === "pending_approval" || rec.approvalStatus === "held") {
      const res = matchAndCalculateBilling(
        {
          accountId: rec.accountId,
          loanNumber: rec.loanNumber,
          customerName: rec.customerName,
          clientBank: rec.clientBank,
          productType: rec.productType,
          bucket: rec.bucket,
          agencyName: rec.agencyName,
          teamLeaderName: rec.teamLeaderName,
          agentId: rec.agentId,
          agentName: rec.agentName,
          resolutionDate: rec.resolutionDate,
          resolutionAmount: rec.resolutionAmount,
          resolutionType: rec.resolutionType,
        },
        globalBillingRules
      );

      rec.matchedRuleId = res.matchedRule.id;
      rec.matchedRuleName = res.matchedRule.name;
      rec.ruleTypeApplied = res.matchedRule.ruleType;
      rec.rateFormulaApplied = res.rateFormulaApplied;
      rec.effectiveRatePct = res.effectiveRatePct;
      rec.calculatedBilling = res.calculatedBilling;
      rec.gstAmount = res.gstAmount;
      rec.tdsAmount = res.tdsAmount;
      rec.netPayable = res.netPayable;
      rec.approvedBilling = res.calculatedBilling;

      rec.auditLogs.push({
        timestamp: new Date().toISOString(),
        action: "RECALCULATED_AGAINST_LATEST_RULES",
        performedBy: "Rule Engine Refresh",
        details: `Re-evaluated against ${res.matchedRule.name}: ₹${res.calculatedBilling}`,
        newAmount: res.calculatedBilling,
      });

      updatedCount++;
    }
  });

  return { success: true, updatedCount };
}

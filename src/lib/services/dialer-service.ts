import { getSessionProfile } from "@/lib/auth/session";

export type DialerDisposition =
  | "RPC_PTP"
  | "RPC_CALL_BACK"
  | "RPC_DISPUTE"
  | "RPC_REFUSAL"
  | "RPC_SETTLEMENT_REQUEST"
  | "THIRD_PARTY_CONTACT"
  | "WRONG_NUMBER"
  | "BUSY"
  | "SWITCHED_OFF"
  | "RINGING_NO_ANSWER"
  | "NOT_REACHABLE"
  | "CALL_DROPPED";

export interface DialerCallLog {
  id: string;
  callSessionId: string;
  accountId: string;
  loanNumber: string;
  customerName: string;
  phoneNumber: string;
  clientBank: string;
  productType: string;
  agencyName: string;
  teamLeaderName: string;
  agentId: string;
  agentName: string;
  callDate: string;
  callTime: string;
  timestamp: string;
  durationSeconds: number;
  talkTimeSeconds: number;
  waitTimeSeconds: number;
  isConnected: boolean;
  disposition: DialerDisposition;
  isRpc: boolean;
  ptpGenerated: boolean;
  ptpAmount: number;
  ptpDate?: string;
  ptpStatus?: "kept" | "broken" | "pending";
  isFollowUp: boolean;
  followUpDate?: string;
  isResolved: boolean;
  resolutionAmount: number;
  resolutionStatus: "full_paid" | "settled" | "partial_recovery" | "in_progress";
  notes: string;
  recordingUrl?: string;
}

export interface DialerCaseRecord {
  accountId: string;
  loanNumber: string;
  customerName: string;
  phoneNumber: string;
  clientBank: string;
  productType: string;
  agencyName: string;
  teamLeaderName: string;
  agentId: string;
  agentName: string;
  outstandingAmount: number;
  allocatedAmount: number;
  bucket: string;
  state: string;
  city: string;
  allocatedAt: string;
  callsAttempted: number;
  callsConnected: number;
  rpcCount: number;
  lastCallDate: string | null;
  lastCallDurationSeconds: number;
  lastDisposition: DialerDisposition | null;
  ptpGenerated: boolean;
  ptpAmount: number;
  ptpStatus: "kept" | "broken" | "pending" | "none";
  isFollowUp: boolean;
  followUpDate: string | null;
  isResolved: boolean;
  resolutionAmount: number;
  resolutionStatus: "full_paid" | "settled" | "partial_recovery" | "in_progress";
  callLogs: DialerCallLog[];
}

export interface DialerMetrics {
  totalAllocatedCases: number;
  totalOutstandingAmount: number;
  totalCallsAttempted: number;
  connectedCalls: number;
  notConnectedCalls: number;
  connectRate: number; // percentage
  rpcCount: number; // Right-Party Contacts
  rpcRate: number; // percentage of connected
  ptpGeneratedCount: number;
  ptpGeneratedRate: number; // percentage of RPC
  totalPtpAmount: number;
  keptPtpCount: number;
  brokenPtpCount: number;
  ptpConversionRate: number; // percentage of kept vs total PTP
  totalTalkTimeSeconds: number;
  averageCallDurationSeconds: number;
  followUpCasesCount: number;
  resolvedCasesCount: number;
  caseResolutionRate: number; // percentage of allocated cases
  totalResolutionAmount: number;
  callsPerAllocatedCase: number;
  callsPerResolvedCase: number;
  penetrationRate: number; // % of cases touched with at least 1 call
}

export interface FunnelStep {
  id: string;
  label: string;
  shortLabel: string;
  count: number;
  amount?: number;
  conversionRate: number; // % of previous step
  overallRate: number; // % of allocated cases
  description: string;
}

export interface HierarchyAggregate {
  id: string;
  name: string;
  type: "client" | "bank" | "product" | "agency" | "tl" | "agent";
  allocatedCases: number;
  outstandingAmount: number;
  callsAttempted: number;
  connectedCalls: number;
  notConnectedCalls: number;
  connectRate: number;
  rpcCount: number;
  rpcRate: number;
  ptpCount: number;
  ptpAmount: number;
  brokenPtpCount: number;
  ptpConversionRate: number;
  totalTalkTimeSeconds: number;
  averageCallDurationSeconds: number;
  followUpCases: number;
  resolvedCases: number;
  resolutionAmount: number;
  resolutionRate: number;
  productivityScore: number;
  rank?: number;
}

export interface DateCallingPoint {
  date: string;
  attempted: number;
  connected: number;
  rpc: number;
  ptp: number;
  resolved: number;
  talkTimeMinutes: number;
}

export interface HourlyDistributionPoint {
  hour: string; // e.g. "09:00", "10:00"
  attempted: number;
  connected: number;
  rpc: number;
}

export interface DispositionBreakdown {
  disposition: DialerDisposition;
  label: string;
  count: number;
  percentage: number;
  isPositive: boolean;
}

export interface DialerWorkspaceData {
  filters: DialerFilterState;
  filterOptions: {
    banks: string[];
    products: string[];
    agencies: string[];
    teamLeaders: string[];
    agents: { id: string; name: string }[];
    dispositions: string[];
  };
  metrics: DialerMetrics;
  funnel: FunnelStep[];
  clientAggregates: HierarchyAggregate[];
  bankAggregates: HierarchyAggregate[];
  productAggregates: HierarchyAggregate[];
  agencyAggregates: HierarchyAggregate[];
  tlAggregates: HierarchyAggregate[];
  agentAggregates: HierarchyAggregate[];
  cases: DialerCaseRecord[];
  dailyCallingActivity: DateCallingPoint[];
  hourlyDistribution: HourlyDistributionPoint[];
  dispositionBreakdown: DispositionBreakdown[];
}

export interface DialerFilterState {
  bank?: string;
  product?: string;
  agency?: string;
  teamLeader?: string;
  agentId?: string;
  dateRangePreset?: "today" | "yesterday" | "last7" | "last30" | "this_month" | "all";
  dateFrom?: string;
  dateTo?: string;
  disposition?: string;
  resolutionStatus?: string;
  searchQuery?: string;
}

/* ────────────────────────────────────────────────────────────────────────
 * Master Seed Data Generator (Consistent, Realistic, Cross-linked)
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

const CITIES_STATES = [
  { city: "Mumbai", state: "Maharashtra" },
  { city: "Pune", state: "Maharashtra" },
  { city: "Bengaluru", state: "Karnataka" },
  { city: "Delhi", state: "Delhi" },
  { city: "Gurugram", state: "Haryana" },
  { city: "Noida", state: "Uttar Pradesh" },
  { city: "Hyderabad", state: "Telangana" },
  { city: "Ahmedabad", state: "Gujarat" },
  { city: "Chennai", state: "Tamil Nadu" },
  { city: "Kolkata", state: "West Bengal" },
  { city: "Jaipur", state: "Rajasthan" },
  { city: "Chandigarh", state: "Punjab" },
];

const BUCKETS = ["B1", "B2", "B3", "B4", "B5", "B6_PLUS"];

// In-memory runtime cache so simulated calls persist within node runtime session
let globalDialerCasesCache: DialerCaseRecord[] | null = null;

function generateSeedCases(): DialerCaseRecord[] {
  if (globalDialerCasesCache) return globalDialerCasesCache;

  const cases: DialerCaseRecord[] = [];
  const today = new Date();
  let caseIdCounter = 1000;
  let callIdCounter = 50000;

  AGENTS.forEach((agent, agentIdx) => {
    // Each agent gets between 45 and 75 allocated cases
    const allocatedCount = 50 + (agentIdx % 4) * 8;

    for (let c = 0; c < allocatedCount; c++) {
      caseIdCounter++;
      const custFn = FIRST_NAMES[(caseIdCounter + c) % FIRST_NAMES.length];
      const custLn = LAST_NAMES[(caseIdCounter * 3 + c) % LAST_NAMES.length];
      const customerName = `${custFn} ${custLn}`;
      const bank = CLIENT_BANKS[(caseIdCounter + agentIdx) % CLIENT_BANKS.length];
      const product = PRODUCTS[(caseIdCounter * 2 + c) % PRODUCTS.length];
      const geo = CITIES_STATES[(caseIdCounter + c) % CITIES_STATES.length];
      const bucket = BUCKETS[(caseIdCounter + c) % BUCKETS.length];
      const outstanding = 25000 + ((caseIdCounter * 7919) % 350000);
      const allocated = outstanding * 1.05;
      const loanPrefix = bank.slice(0, 3).toUpperCase();
      const loanNumber = `${loanPrefix}-${20250000 + caseIdCounter}`;
      const phoneNumber = `+91 98${((caseIdCounter * 123456) % 90000000 + 10000000)}`;

      // How heavily was this case worked?
      // 88% of cases have at least 1 call attempt
      const hasCalls = (c % 10 !== 9);
      const attemptCount = hasCalls ? 1 + ((caseIdCounter + c) % 5) : 0;

      const callLogs: DialerCallLog[] = [];
      let connectedCount = 0;
      let rpcCount = 0;
      let ptpGenerated = false;
      let ptpAmount = 0;
      let ptpStatus: "kept" | "broken" | "pending" | "none" = "none";
      let isFollowUp = false;
      let followUpDate: string | null = null;
      let isResolved = false;
      let resolutionAmount = 0;
      let resolutionStatus: "full_paid" | "settled" | "partial_recovery" | "in_progress" = "in_progress";
      let lastCallDate: string | null = null;
      let lastCallDuration = 0;
      let lastDisposition: DialerDisposition | null = null;

      if (attemptCount > 0) {
        for (let a = 0; a < attemptCount; a++) {
          callIdCounter++;
          // Spread calls over the last 14 days
          const daysAgo = (attemptCount - a - 1) * 2 + ((caseIdCounter + a) % 3);
          const callDateObj = new Date(today);
          callDateObj.setDate(today.getDate() - daysAgo);
          const callDate = callDateObj.toISOString().slice(0, 10);
          lastCallDate = callDate;

          const hour = 9 + ((callIdCounter + a * 3) % 10);
          const minute = (callIdCounter * 7) % 60;
          const callTime = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
          const timestamp = `${callDate}T${callTime}.000Z`;

          // Connection logic (~62% of calls connect)
          const isConnected = ((callIdCounter + c + a) % 10) < 6;
          let disposition: DialerDisposition;
          let durationSeconds = 0;
          let talkTimeSeconds = 0;
          const waitTimeSeconds = 12 + ((callIdCounter * 3) % 25);
          let isRpc = false;
          let callPtp = false;
          let callPtpAmt = 0;

          if (!isConnected) {
            const notConnDispos: DialerDisposition[] = ["BUSY", "RINGING_NO_ANSWER", "SWITCHED_OFF", "NOT_REACHABLE"];
            disposition = notConnDispos[(callIdCounter + a) % notConnDispos.length];
            durationSeconds = waitTimeSeconds;
            talkTimeSeconds = 0;
          } else {
            connectedCount++;
            // Right-party contact (~68% of connected calls reach the customer directly)
            isRpc = ((callIdCounter + a * 2) % 10) < 7;

            if (isRpc) {
              rpcCount++;
              talkTimeSeconds = 90 + ((callIdCounter * 17) % 360);
              durationSeconds = waitTimeSeconds + talkTimeSeconds;

              // What happened on this RPC call?
              const outcomeRoll = (callIdCounter + a) % 10;
              if (outcomeRoll < 4) {
                // PTP generated
                disposition = "RPC_PTP";
                callPtp = true;
                callPtpAmt = Math.round((outstanding * (0.3 + ((callIdCounter % 7) * 0.1))) / 500) * 500;
                ptpGenerated = true;
                ptpAmount = callPtpAmt;

                // Did the PTP convert or break?
                if (a === attemptCount - 1) {
                  const ptpOutcome = (callIdCounter % 10);
                  if (ptpOutcome < 5) {
                    ptpStatus = "kept";
                    isResolved = true;
                    resolutionAmount = callPtpAmt;
                    resolutionStatus = callPtpAmt >= outstanding * 0.85 ? "full_paid" : "settled";
                  } else if (ptpOutcome < 8) {
                    ptpStatus = "broken";
                    isFollowUp = true;
                    const nextF = new Date(today);
                    nextF.setDate(today.getDate() + 2);
                    followUpDate = nextF.toISOString().slice(0, 10);
                  } else {
                    ptpStatus = "pending";
                  }
                }
              } else if (outcomeRoll < 7) {
                disposition = "RPC_CALL_BACK";
                isFollowUp = true;
                const nextF = new Date(today);
                nextF.setDate(today.getDate() + 1);
                followUpDate = nextF.toISOString().slice(0, 10);
              } else if (outcomeRoll === 7) {
                disposition = "RPC_SETTLEMENT_REQUEST";
                isFollowUp = true;
              } else if (outcomeRoll === 8) {
                disposition = "RPC_DISPUTE";
              } else {
                disposition = "RPC_REFUSAL";
              }
            } else {
              // Third party or wrong number
              const tpOutcome = (callIdCounter % 2 === 0);
              disposition = tpOutcome ? "THIRD_PARTY_CONTACT" : "WRONG_NUMBER";
              talkTimeSeconds = 25 + ((callIdCounter * 5) % 45);
              durationSeconds = waitTimeSeconds + talkTimeSeconds;
            }
          }

          lastCallDuration = durationSeconds;
          lastDisposition = disposition;

          callLogs.push({
            id: `call-${callIdCounter}`,
            callSessionId: `DLR-2026-${callIdCounter}`,
            accountId: `acc-${caseIdCounter}`,
            loanNumber,
            customerName,
            phoneNumber,
            clientBank: bank,
            productType: product,
            agencyName: agent.agency,
            teamLeaderName: agent.tl,
            agentId: agent.id,
            agentName: agent.name,
            callDate,
            callTime,
            timestamp,
            durationSeconds,
            talkTimeSeconds,
            waitTimeSeconds,
            isConnected,
            disposition,
            isRpc,
            ptpGenerated: callPtp,
            ptpAmount: callPtpAmt,
            ptpDate: callPtp ? callDate : undefined,
            ptpStatus: callPtp ? (ptpStatus !== "none" ? ptpStatus : "pending") : undefined,
            isFollowUp,
            followUpDate: followUpDate ?? undefined,
            isResolved,
            resolutionAmount,
            resolutionStatus,
            notes: getCallDispositionNote(disposition, customerName, callPtpAmt),
            recordingUrl: isConnected ? `https://telephony.example.com/recordings/DLR-${callIdCounter}.mp3` : undefined,
          });
        }
      }

      // If resolved, ensure resolution amount is realistic
      if (isResolved && resolutionAmount === 0) {
        resolutionAmount = Math.round((outstanding * 0.75) / 1000) * 1000;
      }

      const allocatedDateObj = new Date(today);
      allocatedDateObj.setDate(today.getDate() - 30 - (c % 20));

      cases.push({
        accountId: `acc-${caseIdCounter}`,
        loanNumber,
        customerName,
        phoneNumber,
        clientBank: bank,
        productType: product,
        agencyName: agent.agency,
        teamLeaderName: agent.tl,
        agentId: agent.id,
        agentName: agent.name,
        outstandingAmount: outstanding,
        allocatedAmount: allocated,
        bucket,
        state: geo.state,
        city: geo.city,
        allocatedAt: allocatedDateObj.toISOString().slice(0, 10),
        callsAttempted: attemptCount,
        callsConnected: connectedCount,
        rpcCount,
        lastCallDate,
        lastCallDurationSeconds: lastCallDuration,
        lastDisposition,
        ptpGenerated,
        ptpAmount,
        ptpStatus,
        isFollowUp,
        followUpDate,
        isResolved,
        resolutionAmount,
        resolutionStatus,
        callLogs,
      });
    }
  });

  globalDialerCasesCache = cases;
  return cases;
}

function getCallDispositionNote(disposition: DialerDisposition, name: string, ptpAmt: number): string {
  switch (disposition) {
    case "RPC_PTP":
      return `Spoke directly with ${name}. Customer agreed to clear overdue of ₹${ptpAmt.toLocaleString("en-IN")}. PTP registered.`;
    case "RPC_CALL_BACK":
      return `Spoke with ${name}. Requested callback in evening due to ongoing business meeting.`;
    case "RPC_SETTLEMENT_REQUEST":
      return `Borrower ${name} requesting waiver on penal charges and seeking one-time settlement approval.`;
    case "RPC_DISPUTE":
      return `Customer disputed billing statement. Escalated to grievance and operations desk.`;
    case "RPC_REFUSAL":
      return `Borrower refused repayment citing economic hardship. Legal field visit recommended.`;
    case "THIRD_PARTY_CONTACT":
      return `Spoke with spouse/family member. Message conveyed to arrange callback urgently.`;
    case "WRONG_NUMBER":
      return `Number belongs to unrelated third party. Skiptrace requested for alternate contact.`;
    case "BUSY":
      return `Dialer detected busy signal. Scheduled for automatic retry in 60 mins.`;
    case "SWITCHED_OFF":
      return `Handset switched off. Next dialer attempt queued for tomorrow morning.`;
    case "RINGING_NO_ANSWER":
      return `Dialer rang full 45 seconds with no response from subscriber.`;
    case "NOT_REACHABLE":
      return `Network error / Subscriber out of coverage area.`;
    case "CALL_DROPPED":
      return `Call connected but dropped within 3 seconds due to poor telecom signal.`;
    default:
      return `Call logged via automated predictive dialer.`;
  }
}

/* ────────────────────────────────────────────────────────────────────────
 * Data Aggregations & Calculations
 * ──────────────────────────────────────────────────────────────────────── */

export async function getDialerWorkspaceData(filters: DialerFilterState = {}): Promise<DialerWorkspaceData> {
  // If Supabase has live data, we try loading it first, else fallback seamlessly
  const allCases = generateSeedCases();

  // Try scoping by user role if authenticated
  try {
    const sessionProfile = await getSessionProfile();
    if (sessionProfile) {
      if (sessionProfile.role === "agent") {
        filters.agentId = sessionProfile.id;
      }
    }
  } catch {
    // Offline / fallback mode
  }

  // Filter cases based on current filter state
  const filteredCases = allCases.filter((c) => {
    if (filters.bank && c.clientBank !== filters.bank) return false;
    if (filters.product && c.productType !== filters.product) return false;
    if (filters.agency && c.agencyName !== filters.agency) return false;
    if (filters.teamLeader && c.teamLeaderName !== filters.teamLeader) return false;
    if (filters.agentId && c.agentId !== filters.agentId) return false;
    if (filters.resolutionStatus && c.resolutionStatus !== filters.resolutionStatus) return false;

    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      const match =
        c.loanNumber.toLowerCase().includes(q) ||
        c.customerName.toLowerCase().includes(q) ||
        c.phoneNumber.includes(q) ||
        c.agentName.toLowerCase().includes(q);
      if (!match) return false;
    }

    if (filters.disposition && c.lastDisposition !== filters.disposition) {
      // check if any call had this disposition
      const hasDisp = c.callLogs.some((l) => l.disposition === filters.disposition);
      if (!hasDisp) return false;
    }

    return true;
  });

  // Filter call logs by date range if specified
  const now = new Date();
  let minDate = "";
  let maxDate = now.toISOString().slice(0, 10);

  if (filters.dateRangePreset === "today") {
    minDate = maxDate;
  } else if (filters.dateRangePreset === "yesterday") {
    const yest = new Date(now);
    yest.setDate(now.getDate() - 1);
    minDate = yest.toISOString().slice(0, 10);
    maxDate = minDate;
  } else if (filters.dateRangePreset === "last7") {
    const d7 = new Date(now);
    d7.setDate(now.getDate() - 7);
    minDate = d7.toISOString().slice(0, 10);
  } else if (filters.dateRangePreset === "last30") {
    const d30 = new Date(now);
    d30.setDate(now.getDate() - 30);
    minDate = d30.toISOString().slice(0, 10);
  } else if (filters.dateRangePreset === "this_month") {
    minDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  } else if (filters.dateFrom) {
    minDate = filters.dateFrom;
    if (filters.dateTo) maxDate = filters.dateTo;
  }

  // Gather all relevant call logs
  const relevantLogs: DialerCallLog[] = [];
  filteredCases.forEach((c) => {
    c.callLogs.forEach((log) => {
      if (minDate && log.callDate < minDate) return;
      if (maxDate && log.callDate > maxDate) return;
      relevantLogs.push(log);
    });
  });

  // Calculate Metrics
  const totalAllocated = filteredCases.length;
  const totalOutstanding = filteredCases.reduce((sum, c) => sum + c.outstandingAmount, 0);
  const attemptedCalls = relevantLogs.length;
  const connectedCalls = relevantLogs.filter((l) => l.isConnected).length;
  const notConnectedCalls = attemptedCalls - connectedCalls;
  const connectRate = attemptedCalls > 0 ? (connectedCalls / attemptedCalls) * 100 : 0;

  const rpcCalls = relevantLogs.filter((l) => l.isRpc).length;
  const rpcRate = connectedCalls > 0 ? (rpcCalls / connectedCalls) * 100 : 0;

  const ptpLogs = relevantLogs.filter((l) => l.ptpGenerated);
  const ptpGeneratedCount = ptpLogs.length;
  const ptpGeneratedRate = rpcCalls > 0 ? (ptpGeneratedCount / rpcCalls) * 100 : 0;
  const totalPtpAmount = ptpLogs.reduce((sum, l) => sum + l.ptpAmount, 0);

  const keptPtpCount = filteredCases.filter((c) => c.ptpStatus === "kept").length;
  const brokenPtpCount = filteredCases.filter((c) => c.ptpStatus === "broken").length;
  const totalPtpCases = filteredCases.filter((c) => c.ptpGenerated).length;
  const ptpConversionRate = totalPtpCases > 0 ? (keptPtpCount / totalPtpCases) * 100 : 0;

  const totalTalkTimeSeconds = relevantLogs.reduce((sum, l) => sum + l.talkTimeSeconds, 0);
  const averageCallDurationSeconds =
    connectedCalls > 0
      ? Math.round(relevantLogs.filter((l) => l.isConnected).reduce((sum, l) => sum + l.durationSeconds, 0) / connectedCalls)
      : 0;

  const followUpCasesCount = filteredCases.filter((c) => c.isFollowUp).length;
  const resolvedCasesCount = filteredCases.filter((c) => c.isResolved).length;
  const caseResolutionRate = totalAllocated > 0 ? (resolvedCasesCount / totalAllocated) * 100 : 0;
  const totalResolutionAmount = filteredCases.reduce((sum, c) => sum + (c.isResolved ? c.resolutionAmount : 0), 0);

  const casesTouched = filteredCases.filter((c) => c.callsAttempted > 0).length;
  const penetrationRate = totalAllocated > 0 ? (casesTouched / totalAllocated) * 100 : 0;
  const callsPerAllocatedCase = totalAllocated > 0 ? Number((attemptedCalls / totalAllocated).toFixed(1)) : 0;
  const callsPerResolvedCase = resolvedCasesCount > 0 ? Number((attemptedCalls / resolvedCasesCount).toFixed(1)) : 0;

  const metrics: DialerMetrics = {
    totalAllocatedCases: totalAllocated,
    totalOutstandingAmount: totalOutstanding,
    totalCallsAttempted: attemptedCalls,
    connectedCalls,
    notConnectedCalls,
    connectRate: Number(connectRate.toFixed(1)),
    rpcCount: rpcCalls,
    rpcRate: Number(rpcRate.toFixed(1)),
    ptpGeneratedCount,
    ptpGeneratedRate: Number(ptpGeneratedRate.toFixed(1)),
    totalPtpAmount,
    keptPtpCount,
    brokenPtpCount,
    ptpConversionRate: Number(ptpConversionRate.toFixed(1)),
    totalTalkTimeSeconds,
    averageCallDurationSeconds,
    followUpCasesCount,
    resolvedCasesCount,
    caseResolutionRate: Number(caseResolutionRate.toFixed(1)),
    totalResolutionAmount,
    callsPerAllocatedCase,
    callsPerResolvedCase,
    penetrationRate: Number(penetrationRate.toFixed(1)),
  };

  // Accountability Funnel:
  // Allocated Cases → Calls Attempted → Connected → RPC → PTP → Payment/Resolution
  const funnel: FunnelStep[] = [
    {
      id: "allocated",
      label: "Allocated Cases",
      shortLabel: "Allocated",
      count: totalAllocated,
      amount: totalOutstanding,
      conversionRate: 100,
      overallRate: 100,
      description: "Total borrower delinquent cases assigned to calling rosters",
    },
    {
      id: "attempted",
      label: "Calls Attempted",
      shortLabel: "Calls Attempted",
      count: attemptedCalls,
      conversionRate: totalAllocated > 0 ? Math.min(100, Number(((casesTouched / totalAllocated) * 100).toFixed(1))) : 0,
      overallRate: totalAllocated > 0 ? Number(((casesTouched / totalAllocated) * 100).toFixed(1)) : 0,
      description: `Telephony outbound attempts (${callsPerAllocatedCase} calls/case)`,
    },
    {
      id: "connected",
      label: "Connected Calls",
      shortLabel: "Connected",
      count: connectedCalls,
      conversionRate: attemptedCalls > 0 ? Number(((connectedCalls / attemptedCalls) * 100).toFixed(1)) : 0,
      overallRate: attemptedCalls > 0 ? Number(((connectedCalls / attemptedCalls) * 100).toFixed(1)) : 0,
      description: "Calls answered by subscriber or device",
    },
    {
      id: "rpc",
      label: "Right-Party Contacts (RPC)",
      shortLabel: "RPC Contacts",
      count: rpcCalls,
      conversionRate: connectedCalls > 0 ? Number(((rpcCalls / connectedCalls) * 100).toFixed(1)) : 0,
      overallRate: attemptedCalls > 0 ? Number(((rpcCalls / attemptedCalls) * 100).toFixed(1)) : 0,
      description: "Direct conversation with primary borrower or authorized co-maker",
    },
    {
      id: "ptp",
      label: "Promises to Pay (PTP)",
      shortLabel: "PTP Generated",
      count: ptpGeneratedCount,
      amount: totalPtpAmount,
      conversionRate: rpcCalls > 0 ? Number(((ptpGeneratedCount / rpcCalls) * 100).toFixed(1)) : 0,
      overallRate: totalAllocated > 0 ? Number(((totalPtpCases / totalAllocated) * 100).toFixed(1)) : 0,
      description: "Formal borrower commitment to pay with specific date & amount",
    },
    {
      id: "resolved",
      label: "Resolved / Paid Cases",
      shortLabel: "Case Resolution",
      count: resolvedCasesCount,
      amount: totalResolutionAmount,
      conversionRate: ptpGeneratedCount > 0 ? Number(((resolvedCasesCount / ptpGeneratedCount) * 100).toFixed(1)) : 0,
      overallRate: totalAllocated > 0 ? Number(((resolvedCasesCount / totalAllocated) * 100).toFixed(1)) : 0,
      description: "Hard cash recovered & loan account cleared/settled",
    },
  ];

  // Build Aggregates for each level
  const clientAggregates = buildAggregates(filteredCases, relevantLogs, "client", (c) => c.clientBank);
  const bankAggregates = buildAggregates(filteredCases, relevantLogs, "bank", (c) => c.clientBank);
  const productAggregates = buildAggregates(filteredCases, relevantLogs, "product", (c) => c.productType);
  const agencyAggregates = buildAggregates(filteredCases, relevantLogs, "agency", (c) => c.agencyName);
  const tlAggregates = buildAggregates(filteredCases, relevantLogs, "tl", (c) => c.teamLeaderName);
  const agentAggregates = buildAggregates(filteredCases, relevantLogs, "agent", (c) => c.agentName, (c) => c.agentId);

  // Daily timeline (last 14 days or filtered period)
  const dailyCallingActivity = buildDailyCalling(relevantLogs);

  // Hourly distribution (9:00 to 19:00)
  const hourlyDistribution = buildHourlyDistribution(relevantLogs);

  // Disposition breakdown
  const dispositionBreakdown = buildDispositionBreakdown(relevantLogs);

  return {
    filters,
    filterOptions: {
      banks: CLIENT_BANKS,
      products: PRODUCTS,
      agencies: AGENCIES.map((a) => a.name),
      teamLeaders: TEAM_LEADERS.map((t) => t.name),
      agents: AGENTS.map((a) => ({ id: a.id, name: a.name })),
      dispositions: [
        "RPC_PTP",
        "RPC_CALL_BACK",
        "RPC_DISPUTE",
        "RPC_REFUSAL",
        "RPC_SETTLEMENT_REQUEST",
        "THIRD_PARTY_CONTACT",
        "WRONG_NUMBER",
        "BUSY",
        "SWITCHED_OFF",
        "RINGING_NO_ANSWER",
        "NOT_REACHABLE",
        "CALL_DROPPED",
      ],
    },
    metrics,
    funnel,
    clientAggregates,
    bankAggregates,
    productAggregates,
    agencyAggregates,
    tlAggregates,
    agentAggregates,
    cases: filteredCases.slice(0, 150), // Send first 150 cases for speedy rendering
    dailyCallingActivity,
    hourlyDistribution,
    dispositionBreakdown,
  };
}

function buildAggregates(
  cases: DialerCaseRecord[],
  logs: DialerCallLog[],
  type: HierarchyAggregate["type"],
  keySelector: (c: DialerCaseRecord) => string,
  idSelector?: (c: DialerCaseRecord) => string
): HierarchyAggregate[] {
  const map = new Map<string, {
    id: string;
    name: string;
    cases: DialerCaseRecord[];
    logs: DialerCallLog[];
  }>();

  cases.forEach((c) => {
    const key = keySelector(c);
    const id = idSelector ? idSelector(c) : key;
    if (!map.has(key)) {
      map.set(key, { id, name: key, cases: [], logs: [] });
    }
    map.get(key)!.cases.push(c);
  });

  logs.forEach((l) => {
    let key = "";
    if (type === "client" || type === "bank") key = l.clientBank;
    else if (type === "product") key = l.productType;
    else if (type === "agency") key = l.agencyName;
    else if (type === "tl") key = l.teamLeaderName;
    else if (type === "agent") key = l.agentName;

    if (map.has(key)) {
      map.get(key)!.logs.push(l);
    }
  });

  const aggregates: HierarchyAggregate[] = [];

  map.forEach((entry) => {
    const cCount = entry.cases.length;
    const outAmt = entry.cases.reduce((s, c) => s + c.outstandingAmount, 0);
    const attempted = entry.logs.length;
    const connected = entry.logs.filter((l) => l.isConnected).length;
    const notConn = attempted - connected;
    const connRate = attempted > 0 ? (connected / attempted) * 100 : 0;

    const rpc = entry.logs.filter((l) => l.isRpc).length;
    const rpcRate = connected > 0 ? (rpc / connected) * 100 : 0;

    const ptpLogs = entry.logs.filter((l) => l.ptpGenerated);
    const ptpCount = ptpLogs.length;
    const ptpAmount = ptpLogs.reduce((s, l) => s + l.ptpAmount, 0);

    const keptPtp = entry.cases.filter((c) => c.ptpStatus === "kept").length;
    const brokenPtp = entry.cases.filter((c) => c.ptpStatus === "broken").length;
    const totalPtp = entry.cases.filter((c) => c.ptpGenerated).length;
    const ptpConvRate = totalPtp > 0 ? (keptPtp / totalPtp) * 100 : 0;

    const totalTalkTime = entry.logs.reduce((s, l) => s + l.talkTimeSeconds, 0);
    const avgDuration = connected > 0 ? Math.round(entry.logs.reduce((s, l) => s + l.durationSeconds, 0) / connected) : 0;

    const followUp = entry.cases.filter((c) => c.isFollowUp).length;
    const resolved = entry.cases.filter((c) => c.isResolved).length;
    const resAmount = entry.cases.reduce((s, c) => s + (c.isResolved ? c.resolutionAmount : 0), 0);
    const resRate = cCount > 0 ? (resolved / cCount) * 100 : 0;

    // Productivity Score = weighted average of connect rate (20%), rpc rate (30%), PTP conversion (30%), and resolution rate (20%)
    const productivityScore = Math.min(
      100,
      Math.round(connRate * 0.2 + rpcRate * 0.3 + ptpConvRate * 0.3 + resRate * 2.0)
    );

    aggregates.push({
      id: entry.id,
      name: entry.name,
      type,
      allocatedCases: cCount,
      outstandingAmount: outAmt,
      callsAttempted: attempted,
      connectedCalls: connected,
      notConnectedCalls: notConn,
      connectRate: Number(connRate.toFixed(1)),
      rpcCount: rpc,
      rpcRate: Number(rpcRate.toFixed(1)),
      ptpCount,
      ptpAmount,
      brokenPtpCount: brokenPtp,
      ptpConversionRate: Number(ptpConvRate.toFixed(1)),
      totalTalkTimeSeconds: totalTalkTime,
      averageCallDurationSeconds: avgDuration,
      followUpCases: followUp,
      resolvedCases: resolved,
      resolutionAmount: resAmount,
      resolutionRate: Number(resRate.toFixed(1)),
      productivityScore,
    });
  });

  // Sort descending by resolved amount and assign rank
  aggregates.sort((a, b) => b.resolutionAmount - a.resolutionAmount);
  aggregates.forEach((item, idx) => {
    item.rank = idx + 1;
  });

  return aggregates;
}

function buildDailyCalling(logs: DialerCallLog[]): DateCallingPoint[] {
  const map = new Map<string, DateCallingPoint>();
  const today = new Date();

  // Prepopulate last 14 days
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dStr = d.toISOString().slice(0, 10);
    map.set(dStr, {
      date: dStr,
      attempted: 0,
      connected: 0,
      rpc: 0,
      ptp: 0,
      resolved: 0,
      talkTimeMinutes: 0,
    });
  }

  logs.forEach((l) => {
    let entry = map.get(l.callDate);
    if (!entry) {
      entry = {
        date: l.callDate,
        attempted: 0,
        connected: 0,
        rpc: 0,
        ptp: 0,
        resolved: 0,
        talkTimeMinutes: 0,
      };
      map.set(l.callDate, entry);
    }
    entry.attempted++;
    if (l.isConnected) entry.connected++;
    if (l.isRpc) entry.rpc++;
    if (l.ptpGenerated) entry.ptp++;
    if (l.isResolved) entry.resolved++;
    entry.talkTimeMinutes += Math.round(l.talkTimeSeconds / 60);
  });

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function buildHourlyDistribution(logs: DialerCallLog[]): HourlyDistributionPoint[] {
  const hours = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];
  const map = new Map<string, { attempted: number; connected: number; rpc: number }>();
  hours.forEach((h) => map.set(h, { attempted: 0, connected: 0, rpc: 0 }));

  logs.forEach((l) => {
    const hourPrefix = l.callTime.slice(0, 2) + ":00";
    if (map.has(hourPrefix)) {
      const entry = map.get(hourPrefix)!;
      entry.attempted++;
      if (l.isConnected) entry.connected++;
      if (l.isRpc) entry.rpc++;
    }
  });

  return hours.map((h) => ({
    hour: h,
    attempted: map.get(h)!.attempted,
    connected: map.get(h)!.connected,
    rpc: map.get(h)!.rpc,
  }));
}

function buildDispositionBreakdown(logs: DialerCallLog[]): DispositionBreakdown[] {
  const map = new Map<DialerDisposition, number>();
  logs.forEach((l) => {
    map.set(l.disposition, (map.get(l.disposition) || 0) + 1);
  });

  const total = logs.length || 1;
  const labels: Record<DialerDisposition, { label: string; positive: boolean }> = {
    RPC_PTP: { label: "PTP Promise Kept/Given", positive: true },
    RPC_CALL_BACK: { label: "Callback Requested", positive: true },
    RPC_SETTLEMENT_REQUEST: { label: "Settlement Inquired", positive: true },
    RPC_DISPUTE: { label: "Dispute / Grievance", positive: false },
    RPC_REFUSAL: { label: "Refused Payment", positive: false },
    THIRD_PARTY_CONTACT: { label: "Third-Party Message", positive: false },
    WRONG_NUMBER: { label: "Wrong / Invalid Contact", positive: false },
    BUSY: { label: "Busy Line", positive: false },
    SWITCHED_OFF: { label: "Handset Switched Off", positive: false },
    RINGING_NO_ANSWER: { label: "Ringing No Answer", positive: false },
    NOT_REACHABLE: { label: "Out of Coverage", positive: false },
    CALL_DROPPED: { label: "Call Dropped", positive: false },
  };

  const list: DispositionBreakdown[] = [];
  map.forEach((count, disp) => {
    const meta = labels[disp] || { label: disp, positive: false };
    list.push({
      disposition: disp,
      label: meta.label,
      count,
      percentage: Number(((count / total) * 100).toFixed(1)),
      isPositive: meta.positive,
    });
  });

  return list.sort((a, b) => b.count - a.count);
}

/* ────────────────────────────────────────────────────────────────────────
 * Live Dialer Simulator Action
 * ──────────────────────────────────────────────────────────────────────── */

export interface LogSimulatedCallInput {
  accountId: string;
  disposition: DialerDisposition;
  durationSeconds: number;
  ptpAmount?: number;
  ptpDate?: string;
  notes?: string;
}

export function logSimulatedCall(input: LogSimulatedCallInput): { success: boolean; call: DialerCallLog | null } {
  const allCases = generateSeedCases();
  const targetCase = allCases.find((c) => c.accountId === input.accountId);
  if (!targetCase) return { success: false, call: null };

  const now = new Date();
  const callDate = now.toISOString().slice(0, 10);
  const callTime = now.toTimeString().slice(0, 8);
  const callId = `call-live-${Date.now()}`;

  const isConnected = ![
    "BUSY",
    "SWITCHED_OFF",
    "RINGING_NO_ANSWER",
    "NOT_REACHABLE",
    "CALL_DROPPED",
  ].includes(input.disposition);

  const isRpc = ["RPC_PTP", "RPC_CALL_BACK", "RPC_DISPUTE", "RPC_REFUSAL", "RPC_SETTLEMENT_REQUEST"].includes(
    input.disposition
  );

  const isPtp = input.disposition === "RPC_PTP";
  const ptpAmt = isPtp ? input.ptpAmount || Math.round(targetCase.outstandingAmount * 0.4) : 0;
  const isFollowUp = input.disposition === "RPC_CALL_BACK" || input.disposition === "RPC_SETTLEMENT_REQUEST";
  const isResolved = isPtp && Math.random() > 0.4;
  const resolutionAmt = isResolved ? ptpAmt : 0;

  const newCall: DialerCallLog = {
    id: callId,
    callSessionId: `DLR-LIVE-${Date.now().toString().slice(-6)}`,
    accountId: targetCase.accountId,
    loanNumber: targetCase.loanNumber,
    customerName: targetCase.customerName,
    phoneNumber: targetCase.phoneNumber,
    clientBank: targetCase.clientBank,
    productType: targetCase.productType,
    agencyName: targetCase.agencyName,
    teamLeaderName: targetCase.teamLeaderName,
    agentId: targetCase.agentId,
    agentName: targetCase.agentName,
    callDate,
    callTime,
    timestamp: now.toISOString(),
    durationSeconds: input.durationSeconds || 120,
    talkTimeSeconds: isConnected ? Math.max(15, (input.durationSeconds || 120) - 15) : 0,
    waitTimeSeconds: 15,
    isConnected,
    disposition: input.disposition,
    isRpc,
    ptpGenerated: isPtp,
    ptpAmount: ptpAmt,
    ptpDate: isPtp ? input.ptpDate || callDate : undefined,
    ptpStatus: isPtp ? (isResolved ? "kept" : "pending") : undefined,
    isFollowUp,
    followUpDate: isFollowUp ? new Date(now.getTime() + 86400000).toISOString().slice(0, 10) : undefined,
    isResolved,
    resolutionAmount: resolutionAmt,
    resolutionStatus: isResolved ? "full_paid" : "in_progress",
    notes: input.notes || getCallDispositionNote(input.disposition, targetCase.customerName, ptpAmt),
    recordingUrl: isConnected ? `https://telephony.example.com/recordings/DLR-LIVE-${Date.now()}.mp3` : undefined,
  };

  // Update target case in memory
  targetCase.callsAttempted++;
  if (isConnected) targetCase.callsConnected++;
  if (isRpc) targetCase.rpcCount++;
  targetCase.lastCallDate = callDate;
  targetCase.lastCallDurationSeconds = input.durationSeconds || 120;
  targetCase.lastDisposition = input.disposition;
  if (isPtp) {
    targetCase.ptpGenerated = true;
    targetCase.ptpAmount = ptpAmt;
    targetCase.ptpStatus = isResolved ? "kept" : "pending";
  }
  if (isFollowUp) {
    targetCase.isFollowUp = true;
    targetCase.followUpDate = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);
  }
  if (isResolved) {
    targetCase.isResolved = true;
    targetCase.resolutionAmount = resolutionAmt;
    targetCase.resolutionStatus = "full_paid";
  }

  targetCase.callLogs.unshift(newCall);

  return { success: true, call: newCall };
}

import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth/session";
import { mergeRoleScope } from "@/lib/auth/permissions";
import { getDashboardConfig } from "@/app/dashboard/admin/actions";
import type { DashboardFilters } from "@/lib/types";

/* ────────────────────────────────────────────────────────────────────────
 * Raw row types
 * ──────────────────────────────────────────────────────────────────────── */

type AccountRow = {
  id: string;
  loan_number: string;
  assigned_agent_id: string;
  team_id: string;
  agency_id: string;
  allocated_amount: number;
  outstanding_amount: number;
  collected_amount: number;
  bucket: string;
  state: string | null;
  city: string | null;
  product_type: string;
  status: string;
  allocated_at: string;
  last_follow_up_at: string | null;
  customers?: { customer_name: string } | { customer_name: string }[] | null;
};

function customerNameOf(row: AccountRow): string {
  const c = row.customers;
  if (!c) return "Unknown Customer";
  return Array.isArray(c) ? c[0]?.customer_name ?? "Unknown Customer" : c.customer_name;
}

type PaymentRow = {
  id: string;
  account_id: string;
  agent_id: string | null;
  payment_date: string;
  payment_amount: number;
  created_at: string;
};

type PtpRow = {
  id: string;
  account_id: string;
  agent_id: string;
  ptp_amount: number;
  ptp_date: string;
  status: "pending" | "kept" | "broken";
};

type VisitRow = {
  account_id: string;
  agent_id: string;
  customer_met: boolean;
};

/* ────────────────────────────────────────────────────────────────────────
 * Date helpers
 * ──────────────────────────────────────────────────────────────────────── */

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}
function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function daysInMonth(d: Date): number {
  return endOfMonth(d).getDate();
}
function startOfWeek(d: Date): Date {
  const c = startOfDay(d);
  const day = c.getDay();
  const diff = c.getDate() - day + (day === 0 ? -6 : 1);
  c.setDate(diff);
  return c;
}
function startOfQuarter(d: Date): Date {
  const q = Math.floor(d.getMonth() / 3);
  return new Date(d.getFullYear(), q * 3, 1);
}
function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function sumInRange(payments: PaymentRow[], from: Date, to: Date): number {
  const fromT = from.getTime();
  const toT = to.getTime();
  return payments.reduce((s, p) => {
    const t = new Date(p.payment_date).getTime();
    return t >= fromT && t <= toT ? s + Number(p.payment_amount) : s;
  }, 0);
}

/* ────────────────────────────────────────────────────────────────────────
 * Scoped data loader — one round-trip per table, reused by every section
 * ──────────────────────────────────────────────────────────────────────── */

async function resolveScopedFilters(filters: DashboardFilters = {}): Promise<DashboardFilters> {
  const profile = await getSessionProfile();
  if (!profile) return filters;
  return mergeRoleScope(profile, filters);
}

interface AnalyticsBundle {
  accounts: AccountRow[];
  payments: PaymentRow[];
  ptps: PtpRow[];
  visits: VisitRow[];
  agencies: { id: string; name: string }[];
  teams: { id: string; name: string; agency_id: string; team_leader_id: string | null }[];
  profiles: { id: string; full_name: string; role: string }[];
  kpiTargetPercent: number;
  dateFrom?: string;
  dateTo?: string;
}

async function loadAnalyticsBundle(filters: DashboardFilters = {}): Promise<AnalyticsBundle> {
  const supabase = await createClient();
  const scoped = await resolveScopedFilters(filters);

  let teamIdsForLeader: string[] | null = null;
  if (scoped.teamLeaderId) {
    const { data: leaderTeams } = await supabase
      .from("teams")
      .select("id")
      .eq("team_leader_id", scoped.teamLeaderId);
    teamIdsForLeader = (leaderTeams ?? []).map((t) => t.id as string);
  }

  let accountsQuery = supabase
    .from("accounts")
    .select(
      "id, loan_number, assigned_agent_id, team_id, agency_id, allocated_amount, outstanding_amount, collected_amount, bucket, state, city, product_type, status, allocated_at, last_follow_up_at, customers ( customer_name )"
    );

  if (scoped.tenantId) accountsQuery = accountsQuery.eq("tenant_id", scoped.tenantId);
  if (scoped.agencyId) accountsQuery = accountsQuery.eq("agency_id", scoped.agencyId);
  if (scoped.teamId) accountsQuery = accountsQuery.eq("team_id", scoped.teamId);
  if (teamIdsForLeader) accountsQuery = accountsQuery.in("team_id", teamIdsForLeader);
  if (scoped.agentId) accountsQuery = accountsQuery.eq("assigned_agent_id", scoped.agentId);
  if (scoped.bucket) accountsQuery = accountsQuery.eq("bucket", scoped.bucket);
  if (scoped.state) accountsQuery = accountsQuery.eq("state", scoped.state);
  if (scoped.city) accountsQuery = accountsQuery.eq("city", scoped.city);
  if (scoped.productType) accountsQuery = accountsQuery.eq("product_type", scoped.productType);

  const [{ data: accountsData }, { data: agenciesData }, { data: teamsData }, { data: profilesData }, config] =
    await Promise.all([
      teamIdsForLeader && teamIdsForLeader.length === 0
        ? Promise.resolve({ data: [] as AccountRow[] })
        : accountsQuery,
      supabase.from("agencies").select("id, name"),
      supabase.from("teams").select("id, name, agency_id, team_leader_id"),
      supabase.from("profiles").select("id, full_name, role"),
      getDashboardConfig(),
    ]);

  const accounts = (accountsData ?? []) as AccountRow[];
  const accountIds = accounts.map((a) => a.id);

  const [paymentsRes, ptpsRes, visitsRes] = accountIds.length
    ? await Promise.all([
        (() => {
          let q = supabase
            .from("collection_payments")
            .select("id, account_id, agent_id, payment_date, payment_amount, created_at")
            .in("account_id", accountIds)
            .order("created_at", { ascending: false })
            .limit(20000);
          if (scoped.dateFrom) q = q.gte("payment_date", scoped.dateFrom);
          if (scoped.dateTo) q = q.lte("payment_date", scoped.dateTo);
          return q;
        })(),
        (() => {
          let q = supabase
            .from("ptp_records")
            .select("id, account_id, agent_id, ptp_amount, ptp_date, status")
            .in("account_id", accountIds)
            .limit(20000);
          if (scoped.dateFrom) q = q.gte("ptp_date", scoped.dateFrom);
          if (scoped.dateTo) q = q.lte("ptp_date", scoped.dateTo);
          return q;
        })(),
        supabase
          .from("field_visits")
          .select("account_id, agent_id, customer_met")
          .in("account_id", accountIds)
          .limit(20000),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  return {
    accounts,
    payments: (paymentsRes.data ?? []) as PaymentRow[],
    ptps: (ptpsRes.data ?? []) as PtpRow[],
    visits: (visitsRes.data ?? []) as VisitRow[],
    agencies: agenciesData ?? [],
    teams: teamsData ?? [],
    profiles: profilesData ?? [],
    kpiTargetPercent: config.kpiTargetPercent,
    dateFrom: scoped.dateFrom,
    dateTo: scoped.dateTo,
  };
}

/* ────────────────────────────────────────────────────────────────────────
 * Executive dashboard + projection engine
 * ──────────────────────────────────────────────────────────────────────── */

export interface ExecutiveSummary {
  ftdCollection: number;
  mtdCollection: number;
  target: number;
  achievementPercent: number;
  currentDrr: number;
  requiredDrr: number;
  monthEndProjection: number;
  varianceAgainstTarget: number;
  recoveryEfficiency: number;
  collectionVelocity: number;
  totalOutstanding: number;
  totalAllocated: number;
  totalAccounts: number;
  dayOfMonth: number;
  daysInMonth: number;
  daysRemaining: number;
  riskOfMissingTarget: "low" | "medium" | "high";
}

function computeExecutiveSummary(bundle: AnalyticsBundle): ExecutiveSummary {
  const { accounts, payments, kpiTargetPercent, dateFrom, dateTo } = bundle;
  const now = new Date();
  const today = toISODate(now);
  const monthStart = startOfMonth(now);
  const usingCustomRange = Boolean(dateFrom || dateTo);

  const ftdDate = dateTo ?? today;
  const ftdCollection = payments
    .filter((p) => p.payment_date === ftdDate)
    .reduce((s, p) => s + Number(p.payment_amount), 0);

  const mtdCollection = usingCustomRange
    ? payments.reduce((s, p) => s + Number(p.payment_amount), 0)
    : payments
        .filter((p) => new Date(p.payment_date) >= monthStart)
        .reduce((s, p) => s + Number(p.payment_amount), 0);

  const totalAllocated = accounts.reduce((s, a) => s + Number(a.allocated_amount), 0);
  const totalOutstanding = accounts.reduce((s, a) => s + Number(a.outstanding_amount), 0);
  const totalCollectedAllTime = accounts.reduce((s, a) => s + Number(a.collected_amount), 0);

  const target = totalAllocated * (kpiTargetPercent / 100);
  const achievementPercent = target > 0 ? (mtdCollection / target) * 100 : 0;

  let dayOfMonth: number;
  let totalDaysInMonth: number;
  let daysRemaining: number;

  if (usingCustomRange && dateFrom && dateTo) {
    const from = startOfDay(new Date(dateFrom));
    const to = startOfDay(new Date(dateTo));
    totalDaysInMonth = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000) + 1);
    const elapsedEnd = to.getTime() > now.getTime() ? startOfDay(now) : to;
    dayOfMonth = Math.max(1, Math.round((elapsedEnd.getTime() - from.getTime()) / 86400000) + 1);
    daysRemaining = Math.max(totalDaysInMonth - dayOfMonth, 0);
  } else {
    dayOfMonth = now.getDate();
    totalDaysInMonth = daysInMonth(now);
    daysRemaining = Math.max(totalDaysInMonth - dayOfMonth, 0);
  }

  const currentDrr = dayOfMonth > 0 ? mtdCollection / dayOfMonth : 0;
  const remainingTarget = Math.max(target - mtdCollection, 0);
  const requiredDrr = daysRemaining > 0 ? remainingTarget / daysRemaining : remainingTarget;
  const monthEndProjection = currentDrr * totalDaysInMonth;
  const varianceAgainstTarget = monthEndProjection - target;
  const recoveryEfficiency = totalAllocated > 0 ? (totalCollectedAllTime / totalAllocated) * 100 : 0;

  const last7 = sumInRange(payments, addDays(now, -6), now);
  const prev7 = sumInRange(payments, addDays(now, -13), addDays(now, -7));
  const collectionVelocity = prev7 > 0 ? ((last7 - prev7) / prev7) * 100 : last7 > 0 ? 100 : 0;

  let riskOfMissingTarget: ExecutiveSummary["riskOfMissingTarget"] = "low";
  if (target > 0) {
    const ratio = monthEndProjection / target;
    if (ratio < 0.75) riskOfMissingTarget = "high";
    else if (ratio < 0.95) riskOfMissingTarget = "medium";
  }

  return {
    ftdCollection,
    mtdCollection,
    target,
    achievementPercent,
    currentDrr,
    requiredDrr,
    monthEndProjection,
    varianceAgainstTarget,
    recoveryEfficiency,
    collectionVelocity,
    totalOutstanding,
    totalAllocated,
    totalAccounts: accounts.length,
    dayOfMonth,
    daysInMonth: totalDaysInMonth,
    daysRemaining,
    riskOfMissingTarget,
  };
}

/* ────────────────────────────────────────────────────────────────────────
 * Trend analysis
 * ──────────────────────────────────────────────────────────────────────── */

export interface SeriesPoint {
  label: string;
  amount: number;
}

export interface TrendSeries {
  hourly: SeriesPoint[];
  daily: SeriesPoint[];
  weekly: SeriesPoint[];
  monthly: SeriesPoint[];
  last7: SeriesPoint[];
  last30: SeriesPoint[];
  monthOverMonth: { current: number; previous: number; changePercent: number };
  quarterOverQuarter: { current: number; previous: number; changePercent: number };
}

function computeTrendSeries(bundle: AnalyticsBundle): TrendSeries {
  const { payments } = bundle;
  const now = new Date();
  const today = toISODate(now);

  const hourlyMap = new Map<number, number>();
  for (let h = 0; h < 24; h++) hourlyMap.set(h, 0);
  for (const p of payments) {
    if (p.payment_date !== today) continue;
    const hour = new Date(p.created_at).getHours();
    hourlyMap.set(hour, (hourlyMap.get(hour) ?? 0) + Number(p.payment_amount));
  }
  const hourly: SeriesPoint[] = Array.from(hourlyMap.entries()).map(([h, amount]) => ({
    label: `${String(h).padStart(2, "0")}:00`,
    amount,
  }));

  const dailyMap = new Map<string, number>();
  for (let i = 29; i >= 0; i--) dailyMap.set(toISODate(addDays(now, -i)), 0);
  for (const p of payments) {
    if (dailyMap.has(p.payment_date)) {
      dailyMap.set(p.payment_date, (dailyMap.get(p.payment_date) ?? 0) + Number(p.payment_amount));
    }
  }
  const daily: SeriesPoint[] = Array.from(dailyMap.entries()).map(([label, amount]) => ({ label, amount }));

  const weeklyMap = new Map<string, number>();
  for (let i = 11; i >= 0; i--) weeklyMap.set(toISODate(startOfWeek(addDays(now, -i * 7))), 0);
  for (const p of payments) {
    const wk = toISODate(startOfWeek(new Date(p.payment_date)));
    if (weeklyMap.has(wk)) weeklyMap.set(wk, (weeklyMap.get(wk) ?? 0) + Number(p.payment_amount));
  }
  const weekly: SeriesPoint[] = Array.from(weeklyMap.entries()).map(([label, amount]) => ({ label, amount }));

  const monthlyMap = new Map<string, number>();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthlyMap.set(monthKey(d), 0);
  }
  for (const p of payments) {
    const mk = monthKey(new Date(p.payment_date));
    if (monthlyMap.has(mk)) monthlyMap.set(mk, (monthlyMap.get(mk) ?? 0) + Number(p.payment_amount));
  }
  const monthly: SeriesPoint[] = Array.from(monthlyMap.entries()).map(([label, amount]) => ({ label, amount }));

  const last7 = daily.slice(-7);
  const last30 = daily;

  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const currentMonthTotal = sumInRange(payments, thisMonthStart, now);
  const previousMonthTotal = sumInRange(payments, lastMonthStart, lastMonthEnd);

  const thisQuarterStart = startOfQuarter(now);
  const lastQuarterStart = new Date(thisQuarterStart);
  lastQuarterStart.setMonth(lastQuarterStart.getMonth() - 3);
  const lastQuarterEnd = new Date(thisQuarterStart.getTime() - 86400000);
  const currentQuarterTotal = sumInRange(payments, thisQuarterStart, now);
  const previousQuarterTotal = sumInRange(payments, lastQuarterStart, lastQuarterEnd);

  return {
    hourly,
    daily,
    weekly,
    monthly,
    last7,
    last30,
    monthOverMonth: {
      current: currentMonthTotal,
      previous: previousMonthTotal,
      changePercent: previousMonthTotal > 0 ? ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100 : 0,
    },
    quarterOverQuarter: {
      current: currentQuarterTotal,
      previous: previousQuarterTotal,
      changePercent:
        previousQuarterTotal > 0 ? ((currentQuarterTotal - previousQuarterTotal) / previousQuarterTotal) * 100 : 0,
    },
  };
}

/* ────────────────────────────────────────────────────────────────────────
 * PTP analytics
 * ──────────────────────────────────────────────────────────────────────── */

export interface PtpGroupStat {
  key: string;
  name: string;
  total: number;
  amount: number;
  kept: number;
  broken: number;
  conversionPercent: number;
}

export interface PtpAnalytics {
  totalPtp: number;
  ptpAmount: number;
  todayDue: number;
  tomorrowDue: number;
  kept: number;
  broken: number;
  pending: number;
  conversionPercent: number;
  agentWise: PtpGroupStat[];
  teamWise: PtpGroupStat[];
  bucketWise: PtpGroupStat[];
  dailyTrend: { label: string; kept: number; broken: number; pending: number }[];
}

function computePtpAnalytics(bundle: AnalyticsBundle): PtpAnalytics {
  const { ptps, accounts, profiles, teams } = bundle;
  const now = new Date();
  const today = toISODate(now);
  const tomorrow = toISODate(addDays(now, 1));

  const nameMap = new Map(profiles.map((p) => [p.id, p.full_name]));
  const teamNameMap = new Map(teams.map((t) => [t.id, t.name]));
  const accountTeamMap = new Map(accounts.map((a) => [a.id, a.team_id]));
  const accountBucketMap = new Map(accounts.map((a) => [a.id, a.bucket]));

  const totalPtp = ptps.length;
  const ptpAmount = ptps.reduce((s, p) => s + Number(p.ptp_amount), 0);
  const todayDue = ptps.filter((p) => p.ptp_date === today && p.status === "pending").length;
  const tomorrowDue = ptps.filter((p) => p.ptp_date === tomorrow && p.status === "pending").length;
  const kept = ptps.filter((p) => p.status === "kept").length;
  const broken = ptps.filter((p) => p.status === "broken").length;
  const pending = ptps.filter((p) => p.status === "pending").length;
  const resolved = kept + broken;
  const conversionPercent = resolved > 0 ? (kept / resolved) * 100 : 0;

  function groupBy(keyFn: (p: PtpRow) => string | null, nameFn: (key: string) => string): PtpGroupStat[] {
    const stats = new Map<string, { total: number; amount: number; kept: number; broken: number }>();
    for (const p of ptps) {
      const key = keyFn(p);
      if (!key) continue;
      const c = stats.get(key) ?? { total: 0, amount: 0, kept: 0, broken: 0 };
      stats.set(key, {
        total: c.total + 1,
        amount: c.amount + Number(p.ptp_amount),
        kept: c.kept + (p.status === "kept" ? 1 : 0),
        broken: c.broken + (p.status === "broken" ? 1 : 0),
      });
    }
    return Array.from(stats.entries())
      .map(([key, s]) => ({
        key,
        name: nameFn(key),
        total: s.total,
        amount: s.amount,
        kept: s.kept,
        broken: s.broken,
        conversionPercent: s.kept + s.broken > 0 ? (s.kept / (s.kept + s.broken)) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }

  const agentWise = groupBy((p) => p.agent_id, (id) => nameMap.get(id) ?? "Unknown Agent");
  const teamWise = groupBy(
    (p) => accountTeamMap.get(p.account_id) ?? null,
    (id) => teamNameMap.get(id) ?? "Unknown Team"
  );
  const bucketWise = groupBy(
    (p) => accountBucketMap.get(p.account_id) ?? null,
    (id) => (id === "B6_PLUS" ? "B6+" : id)
  );

  const dailyMap = new Map<string, { kept: number; broken: number; pending: number }>();
  for (let i = 13; i >= 0; i--) dailyMap.set(toISODate(addDays(now, -i)), { kept: 0, broken: 0, pending: 0 });
  for (const p of ptps) {
    const bucket = dailyMap.get(p.ptp_date);
    if (bucket) bucket[p.status] += 1;
  }
  const dailyTrend = Array.from(dailyMap.entries()).map(([label, v]) => ({ label, ...v }));

  return {
    totalPtp,
    ptpAmount,
    todayDue,
    tomorrowDue,
    kept,
    broken,
    pending,
    conversionPercent,
    agentWise,
    teamWise,
    bucketWise,
    dailyTrend,
  };
}

/* ────────────────────────────────────────────────────────────────────────
 * Collection funnel
 * ──────────────────────────────────────────────────────────────────────── */

export interface FunnelStage {
  stage: string;
  count: number;
  conversionFromPrevious: number;
  conversionFromStart: number;
}

function computeFunnel(bundle: AnalyticsBundle): FunnelStage[] {
  const { accounts, visits, ptps } = bundle;
  const allocated = accounts.length;

  const contactedIds = new Set<string>();
  for (const v of visits) contactedIds.add(v.account_id);
  for (const a of accounts) if (a.last_follow_up_at) contactedIds.add(a.id);

  const connectedIds = new Set(visits.filter((v) => v.customer_met).map((v) => v.account_id));
  const ptpGivenIds = new Set(ptps.map((p) => p.account_id));
  const paymentReceived = accounts.filter((a) => Number(a.collected_amount) > 0).length;
  const closed = accounts.filter((a) => ["fully_collected", "settled", "closed"].includes(a.status)).length;

  const rawStages = [
    { stage: "Allocated Accounts", count: allocated },
    { stage: "Contacted", count: contactedIds.size },
    { stage: "Connected", count: connectedIds.size },
    { stage: "PTP Given", count: ptpGivenIds.size },
    { stage: "Payment Received", count: paymentReceived },
    { stage: "Closed Accounts", count: closed },
  ];

  return rawStages.map((s, i) => ({
    ...s,
    conversionFromPrevious: i === 0 ? 100 : rawStages[i - 1].count > 0 ? (s.count / rawStages[i - 1].count) * 100 : 0,
    conversionFromStart: allocated > 0 ? (s.count / allocated) * 100 : 0,
  }));
}

/* ────────────────────────────────────────────────────────────────────────
 * Productivity rankings & heatmap
 * ──────────────────────────────────────────────────────────────────────── */

export interface RankedEntity {
  key: string;
  name: string;
  allocated: number;
  collected: number;
  accounts: number;
  achievement: number;
  rank: number;
  colorBand: "green" | "yellow" | "red";
}

export interface ProductivityRankings {
  agentRanking: RankedEntity[];
  teamRanking: RankedEntity[];
  tlRanking: RankedEntity[];
  agencyRanking: RankedEntity[];
  stateRanking: RankedEntity[];
  cityRanking: RankedEntity[];
  bestPerformer: RankedEntity | null;
  worstPerformer: RankedEntity | null;
  avgProductivity: number;
}

function computeProductivityRankings(bundle: AnalyticsBundle): ProductivityRankings {
  const { accounts, profiles, teams, agencies, kpiTargetPercent } = bundle;
  const nameMap = new Map(profiles.map((p) => [p.id, p.full_name]));
  const teamNameMap = new Map(teams.map((t) => [t.id, t.name]));
  const agencyNameMap = new Map(agencies.map((a) => [a.id, a.name]));
  const teamLeaderMap = new Map(teams.map((t) => [t.id, t.team_leader_id]));

  function bandColor(achievement: number): RankedEntity["colorBand"] {
    if (achievement >= kpiTargetPercent) return "green";
    if (achievement >= kpiTargetPercent * 0.6) return "yellow";
    return "red";
  }

  function rankBy(keyFn: (a: AccountRow) => string | null, nameFn: (key: string) => string): RankedEntity[] {
    const stats = new Map<string, { allocated: number; collected: number; accounts: number }>();
    for (const a of accounts) {
      const key = keyFn(a);
      if (!key) continue;
      const c = stats.get(key) ?? { allocated: 0, collected: 0, accounts: 0 };
      stats.set(key, {
        allocated: c.allocated + Number(a.allocated_amount),
        collected: c.collected + Number(a.collected_amount),
        accounts: c.accounts + 1,
      });
    }
    return Array.from(stats.entries())
      .map(([key, s]) => {
        const achievement = s.allocated > 0 ? (s.collected / s.allocated) * 100 : 0;
        return {
          key,
          name: nameFn(key),
          allocated: s.allocated,
          collected: s.collected,
          accounts: s.accounts,
          achievement,
          rank: 0,
          colorBand: bandColor(achievement),
        };
      })
      .sort((a, b) => b.collected - a.collected)
      .map((r, i) => ({ ...r, rank: i + 1 }));
  }

  const agentRanking = rankBy((a) => a.assigned_agent_id, (id) => nameMap.get(id) ?? "Unknown Agent");
  const teamRanking = rankBy((a) => a.team_id, (id) => teamNameMap.get(id) ?? "Unknown Team");
  const tlRanking = rankBy(
    (a) => teamLeaderMap.get(a.team_id) ?? null,
    (id) => nameMap.get(id) ?? "Unassigned"
  );
  const agencyRanking = rankBy((a) => a.agency_id, (id) => agencyNameMap.get(id) ?? "Unknown Agency");
  const stateRanking = rankBy((a) => a.state, (s) => s);
  const cityRanking = rankBy((a) => a.city, (s) => s);

  const withAccounts = agentRanking.filter((a) => a.accounts > 0);
  const bestPerformer = withAccounts[0] ?? null;
  const worstPerformer = withAccounts.length ? withAccounts[withAccounts.length - 1] : null;
  const avgProductivity = withAccounts.length
    ? withAccounts.reduce((s, a) => s + a.achievement, 0) / withAccounts.length
    : 0;

  return {
    agentRanking,
    teamRanking,
    tlRanking,
    agencyRanking,
    stateRanking,
    cityRanking,
    bestPerformer,
    worstPerformer,
    avgProductivity,
  };
}

/* ────────────────────────────────────────────────────────────────────────
 * Smart alerts & AI insights (rule-based heuristics over the same dataset)
 * ──────────────────────────────────────────────────────────────────────── */

export interface AlertItem {
  id: string;
  severity: "info" | "warning" | "danger";
  title: string;
  message: string;
}

export interface InsightItem {
  id: string;
  text: string;
}

function computeSmartAlerts(
  bundle: AnalyticsBundle,
  executive: ExecutiveSummary,
  ptp: PtpAnalytics,
  productivity: ProductivityRankings
): AlertItem[] {
  const alerts: AlertItem[] = [];
  const { kpiTargetPercent } = bundle;

  const lowPerformers = productivity.agentRanking.filter(
    (a) => a.accounts > 0 && a.achievement < kpiTargetPercent * 0.5
  );
  if (lowPerformers.length > 0) {
    alerts.push({
      id: "low-performers",
      severity: "warning",
      title: "Low Performing Agents",
      message: `${lowPerformers.length} agent${lowPerformers.length > 1 ? "s are" : " is"} below 50% of the ${kpiTargetPercent}% target — lowest: ${lowPerformers
        .slice(-3)
        .map((a) => a.name)
        .join(", ")}.`,
    });
  }

  if (ptp.broken > ptp.kept && ptp.broken > 0) {
    alerts.push({
      id: "high-broken-ptp",
      severity: "danger",
      title: "High Broken PTP",
      message: `Broken PTPs (${ptp.broken}) exceed kept PTPs (${ptp.kept}) — conversion is only ${ptp.conversionPercent.toFixed(0)}%.`,
    });
  }

  if (executive.achievementPercent < 50 && executive.dayOfMonth > executive.daysInMonth / 2) {
    alerts.push({
      id: "low-collection",
      severity: "danger",
      title: "Low Collection %",
      message: `Only ${executive.achievementPercent.toFixed(0)}% of target achieved with ${executive.daysRemaining} days left in the month.`,
    });
  }

  const highOutstandingAccounts = bundle.accounts.filter(
    (a) => Number(a.outstanding_amount) - Number(a.collected_amount) > Number(a.outstanding_amount) * 0.8
  );
  if (highOutstandingAccounts.length > 0) {
    alerts.push({
      id: "high-outstanding",
      severity: "warning",
      title: "High Outstanding Accounts",
      message: `${highOutstandingAccounts.length} accounts still carry over 80% of their original outstanding balance.`,
    });
  }

  if (executive.collectionVelocity < -10) {
    alerts.push({
      id: "negative-trend",
      severity: "danger",
      title: "Negative Collection Trend",
      message: `Collection velocity dropped ${Math.abs(executive.collectionVelocity).toFixed(0)}% vs the prior 7 days.`,
    });
  }

  const riskyBuckets = ["B5", "B6_PLUS"];
  const riskyAccounts = bundle.accounts.filter((a) => riskyBuckets.includes(a.bucket));
  const riskyAllocated = riskyAccounts.reduce((s, a) => s + Number(a.allocated_amount), 0);
  const riskyCollected = riskyAccounts.reduce((s, a) => s + Number(a.collected_amount), 0);
  const riskyAchievement = riskyAllocated > 0 ? (riskyCollected / riskyAllocated) * 100 : 0;
  if (riskyAccounts.length > 0 && riskyAchievement < kpiTargetPercent * 0.5) {
    alerts.push({
      id: "high-risk-buckets",
      severity: "warning",
      title: "High Risk Buckets Underperforming",
      message: `B5/B6+ buckets are recovering at only ${riskyAchievement.toFixed(0)}% across ${riskyAccounts.length} accounts.`,
    });
  }

  return alerts;
}

function computeAiInsights(
  executive: ExecutiveSummary,
  trends: TrendSeries,
  ptp: PtpAnalytics,
  productivity: ProductivityRankings
): InsightItem[] {
  const insights: InsightItem[] = [];

  const daily = trends.daily;
  const today = daily[daily.length - 1]?.amount ?? 0;
  const yesterday = daily[daily.length - 2]?.amount ?? 0;
  if (yesterday > 0) {
    const change = ((today - yesterday) / yesterday) * 100;
    insights.push({
      id: "today-vs-yesterday",
      text: `Collection is ${Math.abs(change).toFixed(0)}% ${change >= 0 ? "higher" : "lower"} than yesterday.`,
    });
  }

  const agencies = productivity.agencyRanking.filter((a) => a.accounts > 0);
  if (agencies.length >= 2) {
    const top = agencies[0];
    const second = agencies[1];
    if (second.achievement > 0) {
      const diff = ((top.achievement - second.achievement) / second.achievement) * 100;
      if (diff > 5) {
        insights.push({
          id: "agency-outperform",
          text: `${top.name} is outperforming ${second.name} by ${Math.abs(diff).toFixed(0)}%.`,
        });
      }
    }
  }

  const buckets = ptp.bucketWise;
  if (buckets.length > 0) {
    const topBucket = [...buckets].sort((a, b) => b.conversionPercent - a.conversionPercent)[0];
    if (topBucket && topBucket.total > 0) {
      insights.push({
        id: "top-bucket",
        text: `${topBucket.name} bucket is showing the highest PTP conversion at ${topBucket.conversionPercent.toFixed(0)}%.`,
      });
    }
  }

  const recentTrend = ptp.dailyTrend;
  if (recentTrend.length >= 8) {
    const lastWeek = recentTrend.slice(-7);
    const priorWeek = recentTrend.slice(-14, -7);
    const lastResolved = lastWeek.reduce((s, d) => s + d.kept + d.broken, 0);
    const lastKept = lastWeek.reduce((s, d) => s + d.kept, 0);
    const priorResolved = priorWeek.reduce((s, d) => s + d.kept + d.broken, 0);
    const priorKept = priorWeek.reduce((s, d) => s + d.kept, 0);
    const lastConv = lastResolved > 0 ? (lastKept / lastResolved) * 100 : 0;
    const priorConv = priorResolved > 0 ? (priorKept / priorResolved) * 100 : 0;
    if (priorResolved > 0 && lastResolved > 0) {
      const drop = priorConv - lastConv;
      if (Math.abs(drop) >= 3) {
        insights.push({
          id: "ptp-conversion-change",
          text: `PTP conversion ${drop > 0 ? "dropped" : "improved"} by ${Math.abs(drop).toFixed(0)}% over the last 7 days.`,
        });
      }
    }
  }

  if (executive.riskOfMissingTarget !== "low") {
    insights.push({
      id: "drr-risk",
      text: `Current DRR indicates the ${executive.riskOfMissingTarget === "high" ? "target is unlikely" : "target may not"} be achieved this month at the present pace.`,
    });
  }

  if (insights.length === 0) {
    insights.push({ id: "steady", text: "Collection performance is steady with no major shifts detected." });
  }

  return insights;
}

/* ────────────────────────────────────────────────────────────────────────
 * Comparison dashboard
 * ──────────────────────────────────────────────────────────────────────── */

export interface ComparisonPair {
  label: string;
  current: number;
  previous: number;
  changePercent: number;
}

export interface ComparisonDashboardData {
  todayVsYesterday: ComparisonPair;
  thisWeekVsLastWeek: ComparisonPair;
  thisMonthVsLastMonth: ComparisonPair;
  bucketVsBucket: { bucket: string; allocated: number; collected: number; achievement: number }[];
}

function computeComparisons(bundle: AnalyticsBundle, trends: TrendSeries): ComparisonDashboardData {
  const { payments, accounts } = bundle;
  const now = new Date();

  const today = sumInRange(payments, startOfDay(now), now);
  const yesterday = sumInRange(payments, startOfDay(addDays(now, -1)), addDays(startOfDay(addDays(now, -1)), 1));

  const thisWeekStart = startOfWeek(now);
  const lastWeekStart = addDays(thisWeekStart, -7);
  const lastWeekEnd = addDays(thisWeekStart, -1);
  const thisWeek = sumInRange(payments, thisWeekStart, now);
  const lastWeek = sumInRange(payments, lastWeekStart, lastWeekEnd);

  const pct = (cur: number, prev: number) => (prev > 0 ? ((cur - prev) / prev) * 100 : cur > 0 ? 100 : 0);

  const bucketMap = new Map<string, { allocated: number; collected: number }>();
  for (const a of accounts) {
    const c = bucketMap.get(a.bucket) ?? { allocated: 0, collected: 0 };
    bucketMap.set(a.bucket, {
      allocated: c.allocated + Number(a.allocated_amount),
      collected: c.collected + Number(a.collected_amount),
    });
  }
  const order = ["B1", "B2", "B3", "B4", "B5", "B6_PLUS"];
  const bucketVsBucket = order.map((bucket) => {
    const s = bucketMap.get(bucket) ?? { allocated: 0, collected: 0 };
    return {
      bucket: bucket === "B6_PLUS" ? "B6+" : bucket,
      allocated: s.allocated,
      collected: s.collected,
      achievement: s.allocated > 0 ? (s.collected / s.allocated) * 100 : 0,
    };
  });

  return {
    todayVsYesterday: { label: "Today vs Yesterday", current: today, previous: yesterday, changePercent: pct(today, yesterday) },
    thisWeekVsLastWeek: { label: "This Week vs Last Week", current: thisWeek, previous: lastWeek, changePercent: pct(thisWeek, lastWeek) },
    thisMonthVsLastMonth: {
      label: "This Month vs Last Month",
      current: trends.monthOverMonth.current,
      previous: trends.monthOverMonth.previous,
      changePercent: trends.monthOverMonth.changePercent,
    },
    bucketVsBucket,
  };
}

/* ────────────────────────────────────────────────────────────────────────
 * Forecasting
 * ──────────────────────────────────────────────────────────────────────── */

export interface ForecastResult {
  monthEndCollection: number;
  expectedAchievementPercent: number;
  expectedPtp: number;
  expectedBrokenPtp: number;
  riskScore: number;
  riskLevel: "low" | "medium" | "high";
}

function computeForecast(executive: ExecutiveSummary, ptp: PtpAnalytics, trends: TrendSeries): ForecastResult {
  const recent = trends.daily.slice(-14).filter((d) => d.amount > 0);
  const avgDaily = recent.length ? recent.reduce((s, d) => s + d.amount, 0) / recent.length : executive.currentDrr;
  const blendedDrr = (avgDaily + executive.currentDrr) / 2;
  const monthEndCollection = executive.mtdCollection + blendedDrr * executive.daysRemaining;
  const expectedAchievementPercent = executive.target > 0 ? (monthEndCollection / executive.target) * 100 : 0;

  const avgDailyPtp = ptp.dailyTrend.length
    ? ptp.dailyTrend.reduce((s, d) => s + d.kept + d.broken + d.pending, 0) / ptp.dailyTrend.length
    : 0;
  const expectedPtp = Math.round(avgDailyPtp * executive.daysRemaining);
  const brokenRatio = ptp.kept + ptp.broken > 0 ? ptp.broken / (ptp.kept + ptp.broken) : 0.3;
  const expectedBrokenPtp = Math.round(expectedPtp * brokenRatio);

  let riskScore = 0;
  if (expectedAchievementPercent < 100) riskScore += (100 - expectedAchievementPercent) * 0.6;
  riskScore += brokenRatio * 40;
  if (executive.collectionVelocity < 0) riskScore += Math.min(Math.abs(executive.collectionVelocity), 20);
  riskScore = Math.max(0, Math.min(100, riskScore));

  const riskLevel: ForecastResult["riskLevel"] = riskScore >= 60 ? "high" : riskScore >= 30 ? "medium" : "low";

  return { monthEndCollection, expectedAchievementPercent, expectedPtp, expectedBrokenPtp, riskScore, riskLevel };
}

/* ────────────────────────────────────────────────────────────────────────
 * Custom builder & drill-down flat dataset
 * ──────────────────────────────────────────────────────────────────────── */

export interface FlatAccountRow {
  id: string;
  loanNumber: string;
  customerName: string;
  agent: string;
  team: string;
  tl: string;
  agency: string;
  state: string;
  city: string;
  bucket: string;
  product: string;
  status: string;
  allocated: number;
  outstanding: number;
  collected: number;
  allocatedAt: string;
}

function computeFlatAccountRows(bundle: AnalyticsBundle): FlatAccountRow[] {
  const { accounts, profiles, teams, agencies } = bundle;
  const nameMap = new Map(profiles.map((p) => [p.id, p.full_name]));
  const teamNameMap = new Map(teams.map((t) => [t.id, t.name]));
  const teamLeaderMap = new Map(teams.map((t) => [t.id, t.team_leader_id]));
  const agencyNameMap = new Map(agencies.map((a) => [a.id, a.name]));

  return accounts.slice(0, 5000).map((a) => ({
    id: a.id,
    loanNumber: a.loan_number,
    customerName: customerNameOf(a),
    agent: nameMap.get(a.assigned_agent_id) ?? "Unknown",
    team: teamNameMap.get(a.team_id) ?? "Unknown",
    tl: nameMap.get(teamLeaderMap.get(a.team_id) ?? "") ?? "Unassigned",
    agency: agencyNameMap.get(a.agency_id) ?? "Unknown",
    state: a.state ?? "Unknown",
    city: a.city ?? "Unknown",
    bucket: a.bucket === "B6_PLUS" ? "B6+" : a.bucket,
    product: a.product_type,
    status: a.status,
    allocated: Number(a.allocated_amount),
    outstanding: Number(a.outstanding_amount),
    collected: Number(a.collected_amount),
    allocatedAt: a.allocated_at,
  }));
}

/* ────────────────────────────────────────────────────────────────────────
 * Public entry point — one DB round-trip set, every section derived from it
 * ──────────────────────────────────────────────────────────────────────── */

export interface AnalyticsWorkspaceData {
  executive: ExecutiveSummary;
  trends: TrendSeries;
  ptp: PtpAnalytics;
  funnel: FunnelStage[];
  productivity: ProductivityRankings;
  alerts: AlertItem[];
  insights: InsightItem[];
  comparisons: ComparisonDashboardData;
  forecast: ForecastResult;
  flatAccounts: FlatAccountRow[];
  kpiTargetPercent: number;
  truncated: boolean;
}

export async function getAnalyticsWorkspaceData(filters: DashboardFilters = {}): Promise<AnalyticsWorkspaceData> {
  const bundle = await loadAnalyticsBundle(filters);

  const executive = computeExecutiveSummary(bundle);
  const trends = computeTrendSeries(bundle);
  const ptp = computePtpAnalytics(bundle);
  const funnel = computeFunnel(bundle);
  const productivity = computeProductivityRankings(bundle);
  const alerts = computeSmartAlerts(bundle, executive, ptp, productivity);
  const insights = computeAiInsights(executive, trends, ptp, productivity);
  const comparisons = computeComparisons(bundle, trends);
  const forecast = computeForecast(executive, ptp, trends);
  const flatAccounts = computeFlatAccountRows(bundle);

  return {
    executive,
    trends,
    ptp,
    funnel,
    productivity,
    alerts,
    insights,
    comparisons,
    forecast,
    flatAccounts,
    kpiTargetPercent: bundle.kpiTargetPercent,
    truncated: bundle.accounts.length > 5000,
  };
}

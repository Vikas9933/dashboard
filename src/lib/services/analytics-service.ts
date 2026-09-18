import { createClient } from "@/lib/supabase/server";
import { mergeRoleScope } from "@/lib/auth/permissions";
import { getSessionProfile } from "@/lib/auth/session";
import type {
  AgentPerformance,
  BucketPerformance,
  CustomerResult,
  DashboardFilters,
  DashboardKpis,
  FieldVisitRow,
  FilterOptions,
  Profile,
  SettlementRow,
  TeamPerformance,
  TrendPoint,
} from "@/lib/types";

type AccountRow = {
  id: string;
  assigned_agent_id: string;
  team_id: string;
  allocated_amount: number;
  outstanding_amount: number;
  collected_amount: number;
  bucket?: string;
  state?: string | null;
  city?: string | null;
  product_type?: string;
};

async function resolveScopedFilters(filters: DashboardFilters = {}): Promise<DashboardFilters> {
  const profile = await getSessionProfile();
  if (!profile) return filters;
  return mergeRoleScope(profile, filters);
}

async function getFilteredAccounts(filters: DashboardFilters = {}): Promise<AccountRow[]> {
  const supabase = await createClient();
  const scoped = await resolveScopedFilters(filters);

  let teamIdsForLeader: string[] | null = null;
  if (scoped.teamLeaderId) {
    const { data: leaderTeams } = await supabase
      .from("teams")
      .select("id")
      .eq("team_leader_id", scoped.teamLeaderId);
    teamIdsForLeader = (leaderTeams ?? []).map((t) => t.id as string);
    if (teamIdsForLeader.length === 0) return [];
  }

  let query = supabase
    .from("accounts")
    .select(
      "id, assigned_agent_id, team_id, allocated_amount, outstanding_amount, collected_amount, bucket, state, city, product_type"
    );

  if (scoped.tenantId) query = query.eq("tenant_id", scoped.tenantId);
  if (scoped.agencyId) query = query.eq("agency_id", scoped.agencyId);
  if (scoped.teamId) query = query.eq("team_id", scoped.teamId);
  if (teamIdsForLeader) query = query.in("team_id", teamIdsForLeader);
  if (scoped.agentId) query = query.eq("assigned_agent_id", scoped.agentId);
  if (scoped.bucket) query = query.eq("bucket", scoped.bucket);
  if (scoped.state) query = query.eq("state", scoped.state);
  if (scoped.city) query = query.eq("city", scoped.city);
  if (scoped.productType) query = query.eq("product_type", scoped.productType);

  const { data } = await query;
  return (data ?? []) as AccountRow[];
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const profile = await getSessionProfile();
  if (!profile) return null;
  return {
    id: profile.id,
    email: profile.email,
    full_name: profile.full_name,
    role: profile.role,
    tenant_id: profile.tenant_id ?? null,
    agency_id: profile.agency_id,
    team_id: profile.team_id,
    is_active: profile.is_active,
  };
}

function emptyKpis(): DashboardKpis {
  return {
    totalAccounts: 0,
    totalOutstanding: 0,
    totalCollected: 0,
    collectionPercentage: 0,
    ptpCount: 0,
    ptpAmount: 0,
    keptPtp: 0,
    brokenPtp: 0,
    activeAgents: 0,
    activeTeams: 0,
  };
}

export async function getDashboardKpis(filters: DashboardFilters = {}): Promise<DashboardKpis> {
  const supabase = await createClient();
  const scoped = await resolveScopedFilters(filters);
  const accounts = await getFilteredAccounts(scoped);
  const accountIds = accounts.map((a) => a.id);

  let ptpQuery = supabase.from("ptp_records").select("ptp_amount, status, account_id");
  if (accountIds.length > 0) {
    ptpQuery = ptpQuery.in("account_id", accountIds);
  } else if (Object.values(scoped).some(Boolean)) {
    return emptyKpis();
  }

  const profile = await getSessionProfile();
  let agentsQuery = supabase.from("profiles").select("id").eq("role", "agent").eq("is_active", true);
  let teamsQuery = supabase.from("teams").select("id").eq("is_active", true);

  if (profile?.role === "manager" && profile.agency_id) {
    agentsQuery = agentsQuery.eq("agency_id", profile.agency_id);
    teamsQuery = teamsQuery.eq("agency_id", profile.agency_id);
  } else if (profile?.role === "team_leader" && profile.team_id) {
    agentsQuery = agentsQuery.eq("team_id", profile.team_id);
    teamsQuery = teamsQuery.eq("id", profile.team_id);
  } else if (profile?.role === "agent") {
    agentsQuery = agentsQuery.eq("id", profile.id);
    if (profile.team_id) teamsQuery = teamsQuery.eq("id", profile.team_id);
  }

  const [ptpRes, agentsRes, teamsRes] = await Promise.all([ptpQuery, agentsQuery, teamsQuery]);

  const ptps = ptpRes.data ?? [];
  const totalAllocated = accounts.reduce((s, a) => s + Number(a.allocated_amount), 0);
  const totalOutstanding = accounts.reduce((s, a) => s + Number(a.outstanding_amount), 0);
  const totalCollected = accounts.reduce((s, a) => s + Number(a.collected_amount), 0);

  return {
    totalAccounts: accounts.length,
    totalOutstanding,
    totalCollected,
    collectionPercentage: totalAllocated > 0 ? (totalCollected / totalAllocated) * 100 : 0,
    ptpCount: ptps.length,
    ptpAmount: ptps.reduce((s, p) => s + Number(p.ptp_amount), 0),
    keptPtp: ptps.filter((p) => p.status === "kept").length,
    brokenPtp: ptps.filter((p) => p.status === "broken").length,
    activeAgents: agentsRes.data?.length ?? 0,
    activeTeams: teamsRes.data?.length ?? 0,
  };
}

function getWeekStart(d: Date): string {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = copy.getDate() - day + (day === 0 ? -6 : 1);
  copy.setDate(diff);
  return copy.toISOString().slice(0, 10);
}

function mapToTrend(map: Map<string, number>): TrendPoint[] {
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, amount]) => ({ label, amount }));
}

export async function getCollectionTrends(filters: DashboardFilters = {}) {
  const supabase = await createClient();
  const scoped = await resolveScopedFilters(filters);
  const accounts = await getFilteredAccounts(scoped);
  const accountIds = accounts.map((a) => a.id);

  let query = supabase
    .from("collection_payments")
    .select("payment_date, payment_amount, account_id")
    .order("payment_date", { ascending: true });

  if (accountIds.length > 0) {
    query = query.in("account_id", accountIds);
  } else if (Object.values(scoped).some(Boolean)) {
    return { daily: [], weekly: [], monthly: [] };
  }

  if (scoped.dateFrom) query = query.gte("payment_date", scoped.dateFrom);
  if (scoped.dateTo) query = query.lte("payment_date", scoped.dateTo);

  const { data } = await query;
  const dailyMap = new Map<string, number>();
  const weeklyMap = new Map<string, number>();
  const monthlyMap = new Map<string, number>();

  for (const row of data ?? []) {
    const date = row.payment_date as string;
    const amount = Number(row.payment_amount);
    dailyMap.set(date, (dailyMap.get(date) ?? 0) + amount);
    const d = new Date(date);
    weeklyMap.set(getWeekStart(d), (weeklyMap.get(getWeekStart(d)) ?? 0) + amount);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyMap.set(monthKey, (monthlyMap.get(monthKey) ?? 0) + amount);
  }

  return {
    daily: mapToTrend(dailyMap).slice(-14),
    weekly: mapToTrend(weeklyMap).slice(-8),
    monthly: mapToTrend(monthlyMap).slice(-6),
  };
}

export async function getAchievementTrend(filters: DashboardFilters = {}): Promise<TrendPoint[]> {
  const supabase = await createClient();
  const scoped = await resolveScopedFilters(filters);
  const accounts = await getFilteredAccounts(scoped);
  const accountIds = accounts.map((a) => a.id);

  let query = supabase
    .from("collection_payments")
    .select("payment_date, payment_amount, account_id")
    .order("payment_date", { ascending: true });

  if (accountIds.length > 0) query = query.in("account_id", accountIds);
  if (scoped.dateFrom) query = query.gte("payment_date", scoped.dateFrom);
  if (scoped.dateTo) query = query.lte("payment_date", scoped.dateTo);

  const { data } = await query;
  const totalAllocated = accounts.reduce((s, a) => s + Number(a.allocated_amount), 0);
  if (totalAllocated === 0) return [];

  const byDate = new Map<string, number>();
  let cumulative = 0;
  for (const row of data ?? []) {
    const date = row.payment_date as string;
    cumulative += Number(row.payment_amount);
    byDate.set(date, (cumulative / totalAllocated) * 100);
  }

  return mapToTrend(byDate).slice(-14);
}

export async function getBucketPerformance(filters: DashboardFilters = {}): Promise<BucketPerformance[]> {
  const scoped = await resolveScopedFilters(filters);
  const accounts = await getFilteredAccounts(scoped);
  const buckets = new Map<string, { allocated: number; collected: number; count: number }>();

  for (const row of accounts) {
    const key = row.bucket as string;
    const current = buckets.get(key) ?? { allocated: 0, collected: 0, count: 0 };
    buckets.set(key, {
      allocated: current.allocated + Number(row.allocated_amount),
      collected: current.collected + Number(row.collected_amount),
      count: current.count + 1,
    });
  }

  const order = ["B1", "B2", "B3", "B4", "B5", "B6_PLUS"];
  return order.map((bucket) => {
    const stats = buckets.get(bucket) ?? { allocated: 0, collected: 0, count: 0 };
    return {
      bucket,
      allocated: stats.allocated,
      collected: stats.collected,
      achievement: stats.allocated > 0 ? (stats.collected / stats.allocated) * 100 : 0,
      accountCount: stats.count,
    };
  });
}

export async function getAgentPerformance(filters: DashboardFilters = {}): Promise<AgentPerformance[]> {
  const supabase = await createClient();
  const scoped = await resolveScopedFilters(filters);
  const accounts = await getFilteredAccounts(scoped);

  const { data: profiles } = await supabase.from("profiles").select("id, full_name");
  const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name as string]));
  const accountIds = accounts.map((a) => a.id);

  let ptpQuery = supabase.from("ptp_records").select("agent_id, ptp_amount, status, account_id");
  if (accountIds.length > 0) ptpQuery = ptpQuery.in("account_id", accountIds);
  const { data: ptps } = await ptpQuery;

  const stats = new Map<string, {
    allocated: number; collected: number; accounts: number;
    ptpCount: number; ptpAmount: number; keptPtp: number; brokenPtp: number;
  }>();

  for (const row of accounts) {
    const id = row.assigned_agent_id;
    const c = stats.get(id) ?? { allocated: 0, collected: 0, accounts: 0, ptpCount: 0, ptpAmount: 0, keptPtp: 0, brokenPtp: 0 };
    stats.set(id, {
      ...c,
      allocated: c.allocated + Number(row.allocated_amount),
      collected: c.collected + Number(row.collected_amount),
      accounts: c.accounts + 1,
    });
  }

  for (const row of ptps ?? []) {
    const id = row.agent_id as string;
    const c = stats.get(id) ?? { allocated: 0, collected: 0, accounts: 0, ptpCount: 0, ptpAmount: 0, keptPtp: 0, brokenPtp: 0 };
    stats.set(id, {
      ...c,
      ptpCount: c.ptpCount + 1,
      ptpAmount: c.ptpAmount + Number(row.ptp_amount),
      keptPtp: c.keptPtp + (row.status === "kept" ? 1 : 0),
      brokenPtp: c.brokenPtp + (row.status === "broken" ? 1 : 0),
    });
  }

  return Array.from(stats.entries())
    .map(([agentId, s]) => ({
      agentId,
      agentName: nameMap.get(agentId) ?? "Unknown Agent",
      allocatedAccounts: s.accounts,
      collectedAmount: s.collected,
      collectionPercentage: s.allocated > 0 ? (s.collected / s.allocated) * 100 : 0,
      ptpCount: s.ptpCount,
      ptpAmount: s.ptpAmount,
      keptPtp: s.keptPtp,
      brokenPtp: s.brokenPtp,
      rank: 0,
    }))
    .sort((a, b) => b.collectedAmount - a.collectedAmount)
    .map((item, i) => ({ ...item, rank: i + 1 }));
}

export async function getTeamPerformance(filters: DashboardFilters = {}): Promise<TeamPerformance[]> {
  const supabase = await createClient();
  const scoped = await resolveScopedFilters(filters);
  const accounts = await getFilteredAccounts(scoped);
  const profile = await getSessionProfile();

  let teamsQuery = supabase.from("teams").select("id, name, team_leader_id");
  if (profile?.role === "manager" && profile.agency_id) {
    teamsQuery = teamsQuery.eq("agency_id", profile.agency_id);
  } else if (profile?.role === "team_leader" && profile.team_id) {
    teamsQuery = teamsQuery.eq("id", profile.team_id);
  }

  const { data: teams } = await teamsQuery;
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, team_id, role")
    .eq("is_active", true);

  const leaderMap = new Map(
    (profiles ?? []).filter((p) => p.role === "team_leader").map((p) => [p.id, p.full_name as string])
  );
  const teamSizeMap = new Map<string, number>();
  for (const p of profiles ?? []) {
    if (p.team_id && p.role === "agent") {
      teamSizeMap.set(p.team_id as string, (teamSizeMap.get(p.team_id as string) ?? 0) + 1);
    }
  }

  const stats = new Map<string, { allocation: number; collection: number }>();
  for (const row of accounts) {
    const id = row.team_id;
    const c = stats.get(id) ?? { allocation: 0, collection: 0 };
    stats.set(id, {
      allocation: c.allocation + Number(row.allocated_amount),
      collection: c.collection + Number(row.collected_amount),
    });
  }

  return (teams ?? [])
    .map((team) => {
      const s = stats.get(team.id as string) ?? { allocation: 0, collection: 0 };
      const leaderId = team.team_leader_id as string | null;
      return {
        teamId: team.id as string,
        teamLeaderName: leaderId ? (leaderMap.get(leaderId) ?? "Unassigned") : "Unassigned",
        teamSize: teamSizeMap.get(team.id as string) ?? 0,
        allocation: s.allocation,
        collection: s.collection,
        achievement: s.allocation > 0 ? (s.collection / s.allocation) * 100 : 0,
        rank: 0,
      };
    })
    .filter((t) => t.allocation > 0 || t.collection > 0)
    .sort((a, b) => b.collection - a.collection)
    .map((item, i) => ({ ...item, rank: i + 1 }));
}

export async function searchCustomers(query: string): Promise<CustomerResult[]> {
  if (!query.trim()) return [];
  const supabase = await createClient();
  const scoped = await resolveScopedFilters({});
  const q = query.trim();

  let dbQuery = supabase
    .from("v_account_summary")
    .select("*")
    .or(`customer_name.ilike.%${q}%,mobile_number.ilike.%${q}%,loan_number.ilike.%${q}%`)
    .limit(20);

  if (scoped.tenantId) dbQuery = dbQuery.eq("tenant_id", scoped.tenantId);
  if (scoped.agencyId) dbQuery = dbQuery.eq("agency_id", scoped.agencyId);
  if (scoped.teamId) dbQuery = dbQuery.eq("team_id", scoped.teamId);
  if (scoped.agentId) dbQuery = dbQuery.eq("assigned_agent_id", scoped.agentId);

  const { data } = await dbQuery;
  return (data ?? []).map((row) => ({
    id: row.id as string,
    customerName: row.customer_name as string,
    mobileNumber: row.mobile_number as string,
    loanNumber: row.loan_number as string,
    outstandingAmount: Number(row.outstanding_amount),
    bucket: row.bucket as string,
    lastPaymentDate: row.last_payment_date as string | null,
    lastFollowUp: row.last_follow_up_at as string | null,
    latestRemark: row.latest_remark as string | null,
  }));
}

export async function getFieldVisits(): Promise<FieldVisitRow[]> {
  const supabase = await createClient();
  const profile = await getSessionProfile();
  let query = supabase
    .from("field_visits")
    .select(`id, visit_date, customer_met, promise_to_pay, ptp_amount, settlement_interest, remarks, agent_id,
      accounts ( loan_number, customers ( customer_name ) ), profiles ( full_name )`)
    .order("visit_date", { ascending: false })
    .limit(50);

  if (profile?.role === "agent") query = query.eq("agent_id", profile.id);
  else if (profile?.role === "team_leader" && profile.team_id) {
    const { data: agents } = await supabase.from("profiles").select("id").eq("team_id", profile.team_id);
    const ids = (agents ?? []).map((a) => a.id);
    if (ids.length) query = query.in("agent_id", ids);
  }

  const { data } = await query;
  return (data ?? []).map((row) => {
    const account = row.accounts as unknown as { loan_number: string; customers: { customer_name: string } } | null;
    const agent = row.profiles as unknown as { full_name: string } | null;
    return {
      id: row.id as string,
      visitDate: row.visit_date as string,
      customerName: account?.customers?.customer_name ?? "—",
      loanNumber: account?.loan_number ?? "—",
      agentName: agent?.full_name ?? "—",
      customerMet: row.customer_met as boolean,
      promiseToPay: row.promise_to_pay as boolean,
      ptpAmount: row.ptp_amount ? Number(row.ptp_amount) : null,
      settlementInterest: row.settlement_interest as boolean,
      remarks: row.remarks as string | null,
    };
  });
}

export async function getSettlements(): Promise<SettlementRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("settlements")
    .select(`id, outstanding_amount, settlement_amount, request_date, status,
      accounts ( loan_number, customers ( customer_name ) )`)
    .order("request_date", { ascending: false })
    .limit(50);

  return (data ?? []).map((row) => {
    const account = row.accounts as unknown as { loan_number: string; customers: { customer_name: string } } | null;
    return {
      id: row.id as string,
      customerName: account?.customers?.customer_name ?? "—",
      loanNumber: account?.loan_number ?? "—",
      outstandingAmount: Number(row.outstanding_amount),
      settlementAmount: Number(row.settlement_amount),
      requestDate: row.request_date as string,
      status: row.status as "pending" | "approved" | "rejected",
    };
  });
}

export async function getFilterOptions(): Promise<FilterOptions> {
  const supabase = await createClient();
  const profile = await getSessionProfile();

  let agenciesQuery = supabase.from("agencies").select("id, name").eq("is_active", true);
  let teamsQuery = supabase.from("teams").select("id, name").eq("is_active", true);
  let profilesQuery = supabase.from("profiles").select("id, full_name, role").eq("is_active", true);
  let accountsQuery = supabase.from("accounts").select("bucket, state, city, product_type");

  if (profile?.tenant_id) {
    agenciesQuery = agenciesQuery.eq("tenant_id", profile.tenant_id);
    accountsQuery = accountsQuery.eq("tenant_id", profile.tenant_id);
    profilesQuery = profilesQuery.eq("tenant_id", profile.tenant_id);
  }

  if (profile?.role === "manager" && profile.agency_id) {
    agenciesQuery = agenciesQuery.eq("id", profile.agency_id);
    teamsQuery = teamsQuery.eq("agency_id", profile.agency_id);
    profilesQuery = profilesQuery.eq("agency_id", profile.agency_id);
  } else if (profile?.role === "team_leader" && profile.team_id) {
    teamsQuery = teamsQuery.eq("id", profile.team_id);
    profilesQuery = profilesQuery.eq("team_id", profile.team_id);
  } else if (profile?.role === "agent") {
    profilesQuery = profilesQuery.eq("id", profile.id);
    if (profile.team_id) teamsQuery = teamsQuery.eq("id", profile.team_id);
  }

  const [agencies, teams, profiles, accounts] = await Promise.all([
    agenciesQuery,
    teamsQuery,
    profilesQuery,
    accountsQuery,
  ]);

  const accts = accounts.data ?? [];
  const profs = profiles.data ?? [];

  return {
    agencies: agencies.data ?? [],
    teams: teams.data ?? [],
    teamLeaders: profs.filter((p) => p.role === "team_leader").map((p) => ({ id: p.id as string, name: p.full_name as string })),
    agents: profs.filter((p) => p.role === "agent" || p.role === "admin").map((p) => ({ id: p.id as string, name: p.full_name as string })),
    buckets: [...new Set(accts.map((a) => a.bucket as string))].sort(),
    states: [...new Set(accts.map((a) => a.state).filter(Boolean) as string[])].sort(),
    cities: [...new Set(accts.map((a) => a.city).filter(Boolean) as string[])].sort(),
    productTypes: [...new Set(accts.map((a) => a.product_type as string))].sort(),
  };
}

export function parseFilters(params: Record<string, string | undefined>): DashboardFilters {
  return {
    dateFrom: params.from,
    dateTo: params.to,
    agencyId: params.agency,
    teamId: params.team,
    teamLeaderId: params.leader,
    agentId: params.agent,
    bucket: params.bucket as DashboardFilters["bucket"],
    state: params.state,
    city: params.city,
    productType: params.product,
  };
}

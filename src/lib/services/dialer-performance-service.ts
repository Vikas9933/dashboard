import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth/session";
import { mergeRoleScope } from "@/lib/auth/permissions";
import type { DashboardFilters } from "@/lib/types";
import {
  buildAccountabilityGaps,
  buildDialerFunnel,
  metricsFromCases,
  type DialerAccountabilityGaps,
  type DialerDailyPoint,
  type DialerFunnelStage,
  type DialerMetrics,
} from "@/lib/services/dialer-metrics";

const RESOLVED_STATUSES = new Set(["fully_collected", "settled", "closed"]);

type AccountRow = {
  id: string;
  loan_number: string;
  assigned_agent_id: string;
  team_id: string;
  agency_id: string;
  allocated_amount: number;
  collected_amount: number;
  product_type: string;
  client_name: string | null;
  bank_name: string | null;
  status: string;
  last_follow_up_at: string | null;
  customers?: { customer_name: string } | { customer_name: string }[] | null;
};

type CallRow = {
  id: string;
  account_id: string | null;
  agent_id: string;
  loan_number: string | null;
  call_started_at: string;
  duration_seconds: number;
  is_connected: boolean;
  is_rpc: boolean;
  is_follow_up: boolean;
  outcome: string;
};

type PtpRow = {
  account_id: string;
  agent_id: string;
  ptp_amount: number;
  status: "pending" | "kept" | "broken";
};

type PaymentRow = {
  account_id: string;
  payment_amount: number;
  payment_date: string;
};

function customerNameOf(row: AccountRow): string {
  const c = row.customers;
  if (!c) return "Unknown Customer";
  return Array.isArray(c) ? c[0]?.customer_name ?? "Unknown Customer" : c.customer_name;
}

async function resolveScopedFilters(filters: DashboardFilters = {}): Promise<DashboardFilters> {
  const profile = await getSessionProfile();
  if (!profile) return filters;
  return mergeRoleScope(profile, filters);
}

export interface DialerEntityRow extends DialerMetrics {
  id: string;
  name: string;
}

export interface DialerCaseRow {
  accountId: string;
  loanNumber: string;
  customerName: string;
  client: string;
  bank: string;
  product: string;
  agency: string;
  tl: string;
  agent: string;
  allocatedAmount: number;
  callsAttempted: number;
  connectedCalls: number;
  rpcCount: number;
  ptpGenerated: number;
  ptpAmount: number;
  brokenPtp: number;
  callDurationSeconds: number;
  followUp: boolean;
  resolved: boolean;
  resolutionAmount: number;
  status: string;
}

export interface DialerWorkspaceData {
  summary: DialerMetrics;
  funnel: DialerFunnelStage[];
  gaps: DialerAccountabilityGaps;
  daily: DialerDailyPoint[];
  clients: DialerEntityRow[];
  banks: DialerEntityRow[];
  products: DialerEntityRow[];
  agencies: DialerEntityRow[];
  teamLeaders: DialerEntityRow[];
  agents: DialerEntityRow[];
  cases: DialerCaseRow[];
}

function inDateRange(iso: string, from?: string, to?: string): boolean {
  const day = iso.slice(0, 10);
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

const IN_CHUNK = 200;

async function fetchInChunks<T>(
  ids: string[],
  load: (chunk: string[]) => Promise<T[] | null>
): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += IN_CHUNK) {
    const rows = await load(ids.slice(i, i + IN_CHUNK));
    if (rows?.length) out.push(...rows);
  }
  return out;
}

export async function getDialerWorkspaceData(filters: DashboardFilters = {}): Promise<DialerWorkspaceData> {
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
      "id, loan_number, assigned_agent_id, team_id, agency_id, allocated_amount, collected_amount, product_type, client_name, bank_name, status, last_follow_up_at, customers ( customer_name )"
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
  if (scoped.clientName) accountsQuery = accountsQuery.eq("client_name", scoped.clientName);
  if (scoped.bankName) accountsQuery = accountsQuery.eq("bank_name", scoped.bankName);

  const [{ data: accountsData }, { data: agenciesData }, { data: teamsData }, { data: profilesData }] =
    await Promise.all([
      teamIdsForLeader && teamIdsForLeader.length === 0
        ? Promise.resolve({ data: [] as AccountRow[] })
        : accountsQuery,
      supabase.from("agencies").select("id, name"),
      supabase.from("teams").select("id, name, agency_id, team_leader_id"),
      supabase.from("profiles").select("id, full_name, role"),
    ]);

  const accounts = (accountsData ?? []) as AccountRow[];
  const accountIds = accounts.map((a) => a.id);
  const agencyName = new Map((agenciesData ?? []).map((a) => [a.id as string, a.name as string]));
  const teamMeta = new Map(
    (teamsData ?? []).map((t) => [
      t.id as string,
      { name: t.name as string, leaderId: t.team_leader_id as string | null },
    ])
  );
  const profileName = new Map((profilesData ?? []).map((p) => [p.id as string, p.full_name as string]));

  const callsByAccount = new Map<string, CallRow[]>();
  const ptpByAccount = new Map<string, PtpRow[]>();
  const payByAccount = new Map<string, number>();
  const dailyMap = new Map<string, DialerDailyPoint>();
  const dailyCases = new Map<string, Set<string>>();

  if (accountIds.length) {
    const [calls, ptps, payments] = await Promise.all([
      fetchInChunks<CallRow>(accountIds, async (chunk) => {
        let q = supabase
          .from("dialer_calls")
          .select("id, account_id, agent_id, loan_number, call_started_at, duration_seconds, is_connected, is_rpc, is_follow_up, outcome")
          .in("account_id", chunk)
          .order("call_started_at", { ascending: false })
          .limit(20000);
        if (scoped.dateFrom) q = q.gte("call_started_at", `${scoped.dateFrom}T00:00:00`);
        if (scoped.dateTo) q = q.lte("call_started_at", `${scoped.dateTo}T23:59:59`);
        const { data } = await q;
        return (data ?? []) as CallRow[];
      }),
      fetchInChunks<PtpRow>(accountIds, async (chunk) => {
        let q = supabase
          .from("ptp_records")
          .select("account_id, agent_id, ptp_amount, status")
          .in("account_id", chunk)
          .limit(20000);
        if (scoped.dateFrom) q = q.gte("ptp_date", scoped.dateFrom);
        if (scoped.dateTo) q = q.lte("ptp_date", scoped.dateTo);
        const { data } = await q;
        return (data ?? []) as PtpRow[];
      }),
      fetchInChunks<PaymentRow>(accountIds, async (chunk) => {
        let q = supabase
          .from("collection_payments")
          .select("account_id, payment_amount, payment_date")
          .in("account_id", chunk)
          .limit(20000);
        if (scoped.dateFrom) q = q.gte("payment_date", scoped.dateFrom);
        if (scoped.dateTo) q = q.lte("payment_date", scoped.dateTo);
        const { data } = await q;
        return (data ?? []) as PaymentRow[];
      }),
    ]);

    for (const call of calls) {
      if (call.account_id) {
        const list = callsByAccount.get(call.account_id) ?? [];
        list.push(call);
        callsByAccount.set(call.account_id, list);
      }
      const date = call.call_started_at.slice(0, 10);
      const point = dailyMap.get(date) ?? {
        date,
        attempted: 0,
        connected: 0,
        rpc: 0,
        uniqueCases: 0,
        durationSeconds: 0,
        resolvedAmount: 0,
      };
      point.attempted += 1;
      if (call.is_connected) point.connected += 1;
      if (call.is_rpc) point.rpc += 1;
      point.durationSeconds += Number(call.duration_seconds) || 0;
      dailyMap.set(date, point);
      if (call.account_id) {
        const set = dailyCases.get(date) ?? new Set<string>();
        set.add(call.account_id);
        dailyCases.set(date, set);
      }
    }
    for (const ptp of ptps) {
      const list = ptpByAccount.get(ptp.account_id) ?? [];
      list.push(ptp);
      ptpByAccount.set(ptp.account_id, list);
    }
    for (const pay of payments) {
      payByAccount.set(pay.account_id, (payByAccount.get(pay.account_id) ?? 0) + Number(pay.payment_amount) || 0);
      const date = pay.payment_date?.slice(0, 10);
      if (!date) continue;
      const point = dailyMap.get(date) ?? {
        date,
        attempted: 0,
        connected: 0,
        rpc: 0,
        uniqueCases: 0,
        durationSeconds: 0,
        resolvedAmount: 0,
      };
      point.resolvedAmount += Number(pay.payment_amount) || 0;
      dailyMap.set(date, point);
    }
  }

  for (const [date, set] of dailyCases) {
    const point = dailyMap.get(date);
    if (point) point.uniqueCases = set.size;
  }

  const cases: DialerCaseRow[] = accounts.map((account) => {
    const accountCalls = callsByAccount.get(account.id) ?? [];
    const accountPtps = ptpByAccount.get(account.id) ?? [];
    const team = teamMeta.get(account.team_id);
    const tlName = team?.leaderId ? profileName.get(team.leaderId) ?? "Unassigned TL" : "Unassigned TL";
    const resolutionAmount = payByAccount.get(account.id) ?? 0;
    const resolved = RESOLVED_STATUSES.has(account.status) || resolutionAmount > 0;
    const followUp =
      accountCalls.some((c) => c.is_follow_up) ||
      Boolean(account.last_follow_up_at && inDateRange(account.last_follow_up_at, scoped.dateFrom, scoped.dateTo));

    return {
      accountId: account.id,
      loanNumber: account.loan_number,
      customerName: customerNameOf(account),
      client: account.client_name || "Unassigned Client",
      bank: account.bank_name || "Unassigned Bank",
      product: account.product_type,
      agency: agencyName.get(account.agency_id) ?? "Unknown Agency",
      tl: tlName,
      agent: profileName.get(account.assigned_agent_id) ?? "Unknown Agent",
      allocatedAmount: Number(account.allocated_amount) || 0,
      callsAttempted: accountCalls.length,
      connectedCalls: accountCalls.filter((c) => c.is_connected).length,
      rpcCount: accountCalls.filter((c) => c.is_rpc).length,
      ptpGenerated: accountPtps.length || accountCalls.filter((c) => c.outcome === "ptp").length,
      ptpAmount: accountPtps.reduce((s, p) => s + Number(p.ptp_amount), 0),
      brokenPtp: accountPtps.filter((p) => p.status === "broken").length,
      callDurationSeconds: accountCalls.reduce((s, c) => s + (Number(c.duration_seconds) || 0), 0),
      followUp,
      resolved: resolved || resolutionAmount > 0,
      resolutionAmount,
      status: account.status,
    };
  });

  function group(keyOf: (row: DialerCaseRow) => string): DialerEntityRow[] {
    const map = new Map<string, DialerCaseRow[]>();
    for (const row of cases) {
      const key = keyOf(row) || "Unknown";
      const list = map.get(key) ?? [];
      list.push(row);
      map.set(key, list);
    }
    return Array.from(map.entries())
      .map(([name, rows]) => ({ id: name, name, ...metricsFromCases(rows) }))
      .sort((a, b) => b.callsAttempted - a.callsAttempted || b.resolutionAmount - a.resolutionAmount);
  }

  const summary = metricsFromCases(cases);
  const uniqueAttempted = new Set(cases.filter((c) => c.callsAttempted > 0).map((c) => c.accountId)).size;
  const uniqueConnected = new Set(cases.filter((c) => c.connectedCalls > 0).map((c) => c.accountId)).size;
  const uniqueRpc = new Set(cases.filter((c) => c.rpcCount > 0).map((c) => c.accountId)).size;
  const uniquePtp = new Set(cases.filter((c) => c.ptpGenerated > 0).map((c) => c.accountId)).size;
  const uniqueResolved = new Set(cases.filter((c) => c.resolved).map((c) => c.accountId)).size;

  return {
    summary,
    funnel: buildDialerFunnel({
      allocated: cases.length,
      attempted: uniqueAttempted,
      connected: uniqueConnected,
      rpc: uniqueRpc,
      ptp: uniquePtp,
      resolved: uniqueResolved,
    }),
    gaps: buildAccountabilityGaps(cases),
    daily: Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
    clients: group((r) => r.client),
    banks: group((r) => r.bank),
    products: group((r) => r.product),
    agencies: group((r) => r.agency),
    teamLeaders: group((r) => r.tl),
    agents: group((r) => r.agent),
    cases,
  };
}

export async function ingestDialerCalls(
  rows: Array<{
    loan_number?: string;
    account_id?: string;
    agent_id?: string;
    phone_number?: string;
    call_started_at?: string;
    duration_seconds?: number;
    connected?: boolean;
    rpc?: boolean;
    follow_up?: boolean;
    outcome?: string;
    external_call_id?: string;
    dialer_source?: string;
    remarks?: string;
  }>
): Promise<{ inserted: number; skipped: number; errors: string[] }> {
  const profile = await getSessionProfile();
  if (!profile) throw new Error("Not authenticated.");
  if (!profile.tenant_id && profile.role !== "super_admin") {
    throw new Error("Your account is not linked to a client.");
  }

  const supabase = await createClient();
  const errors: string[] = [];
  let inserted = 0;
  let skipped = 0;

  for (const [index, row] of rows.entries()) {
    let accountId = row.account_id ?? null;
    let agentId = row.agent_id ?? profile.id;
    let tenantId = profile.tenant_id;
    let customerId: string | null = null;
    let loanNumber = row.loan_number ?? null;

    if (!accountId && row.loan_number) {
      let q = supabase
        .from("accounts")
        .select("id, assigned_agent_id, tenant_id, customer_id, loan_number")
        .eq("loan_number", row.loan_number);
      if (profile.tenant_id) q = q.eq("tenant_id", profile.tenant_id);
      const { data: account } = await q.maybeSingle();
      if (!account) {
        errors.push(`Row ${index + 1}: unknown loan_number ${row.loan_number}`);
        continue;
      }
      accountId = account.id as string;
      tenantId = (account.tenant_id as string) ?? tenantId;
      customerId = (account.customer_id as string) ?? null;
      loanNumber = account.loan_number as string;
      if (!row.agent_id) agentId = account.assigned_agent_id as string;
    } else if (accountId) {
      const { data: account } = await supabase
        .from("accounts")
        .select("id, assigned_agent_id, tenant_id, customer_id, loan_number")
        .eq("id", accountId)
        .maybeSingle();
      if (!account) {
        errors.push(`Row ${index + 1}: unknown account_id`);
        continue;
      }
      tenantId = (account.tenant_id as string) ?? tenantId;
      customerId = (account.customer_id as string) ?? null;
      loanNumber = (account.loan_number as string) ?? loanNumber;
      if (!row.agent_id) agentId = account.assigned_agent_id as string;
    }

    if (!tenantId) {
      errors.push(`Row ${index + 1}: missing tenant`);
      continue;
    }

    const connected = Boolean(row.connected || row.rpc || row.outcome === "connected" || row.outcome === "rpc" || row.outcome === "ptp");
    const rpc = Boolean(row.rpc || row.outcome === "rpc" || row.outcome === "ptp");
    const followUp = Boolean(row.follow_up || row.outcome === "follow_up");
    const outcome =
      row.outcome === "ptp" ||
      row.outcome === "rpc" ||
      row.outcome === "connected" ||
      row.outcome === "follow_up" ||
      row.outcome === "wrong_party" ||
      row.outcome === "busy" ||
      row.outcome === "no_answer" ||
      row.outcome === "voicemail"
        ? row.outcome
        : connected
          ? rpc
            ? "rpc"
            : "connected"
          : "not_connected";

    const started = row.call_started_at ? new Date(row.call_started_at) : new Date();
    const duration = Math.max(0, Number(row.duration_seconds) || 0);
    const ended = new Date(started.getTime() + duration * 1000);

    const { error } = await supabase.from("dialer_calls").insert({
      tenant_id: tenantId,
      account_id: accountId,
      agent_id: agentId,
      customer_id: customerId,
      loan_number: loanNumber,
      phone_number: row.phone_number ?? null,
      call_started_at: started.toISOString(),
      call_ended_at: ended.toISOString(),
      duration_seconds: duration,
      outcome,
      is_connected: connected,
      is_rpc: connected && rpc,
      is_follow_up: followUp,
      external_call_id: row.external_call_id ?? null,
      dialer_source: row.dialer_source ?? "api",
      remarks: row.remarks ?? null,
    });

    if (error) {
      if (error.code === "23505") {
        skipped += 1;
        continue;
      }
      errors.push(`Row ${index + 1}: ${error.message}`);
      continue;
    }
    inserted += 1;
  }

  return { inserted, skipped, errors };
}

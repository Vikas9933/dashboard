export type UserRole = "super_admin" | "admin" | "manager" | "team_leader" | "agent";

export type BucketType = "B1" | "B2" | "B3" | "B4" | "B5" | "B6_PLUS";

export type PtpStatus = "pending" | "kept" | "broken";

export type SettlementStatus = "pending" | "approved" | "rejected";

export type PlanStatus = "active" | "trial" | "past_due" | "cancelled" | "suspended";

/** organization_id in SaaS terms — stored as tenants.id */
export type OrganizationId = string;

export type SubscriptionFeatureKey =
  | "user_management"
  | "dashboard"
  | "customer_management"
  | "allocation_module"
  | "ptp_tracking"
  | "collection_tracking"
  | "basic_reports"
  | "excel_export"
  | "search_filters"
  | "advanced_analytics"
  | "target_vs_achievement"
  | "supervisor_performance"
  | "team_leader_performance"
  | "agent_performance"
  | "settlement_tracking"
  | "agency_performance"
  | "audit_logs"
  | "advanced_filters"
  | "dashboard_customization"
  | "email_notifications"
  | "whatsapp_integration"
  | "api_integration"
  | "crm_integration"
  | "collection_system_integration"
  | "auto_data_sync"
  | "webhooks"
  | "custom_workflows"
  | "white_label"
  | "dedicated_database"
  | "custom_reports_modules";

export interface TenantSubscriptionContext {
  organizationId: OrganizationId | null;
  organizationName: string;
  planCode: string;
  planName: string;
  planStatus: PlanStatus;
  userLimit: number;
  storageLimitMb: number;
  currentUserCount: number;
  currentStorageUsedMb: number;
  planFeatures: Record<string, boolean>;
  featureOverrides: Record<string, boolean>;
  isSuperAdmin: boolean;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  tenant_id: string | null;
  agency_id: string | null;
  team_id?: string | null;
  is_active: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  subscription_plan_id?: string | null;
  plan_status?: PlanStatus;
  max_users?: number | null;
  max_storage_mb?: number | null;
  storage_used_mb?: number;
  feature_flags?: Record<string, boolean>;
}

export interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  max_users: number;
  max_storage_mb: number;
  features: Record<string, boolean>;
  is_active: boolean;
}

export interface TenantUsageRow {
  tenant_id: string;
  tenant_name: string;
  slug: string;
  is_active: boolean;
  plan_name: string | null;
  user_count: number;
  account_count: number;
  max_users: number;
  max_storage_mb: number;
  storage_used_mb: number;
}

export interface DashboardFilters {
  tenantId?: string;
  dateFrom?: string;
  dateTo?: string;
  agencyId?: string;
  teamId?: string;
  teamLeaderId?: string;
  agentId?: string;
  bucket?: BucketType;
  state?: string;
  city?: string;
  productType?: string;
}

export interface DashboardKpis {
  totalAccounts: number;
  totalOutstanding: number;
  totalCollected: number;
  collectionPercentage: number;
  ptpCount: number;
  ptpAmount: number;
  keptPtp: number;
  brokenPtp: number;
  activeAgents: number;
  activeTeams: number;
}

export interface TrendPoint {
  label: string;
  amount: number;
}

export interface BucketPerformance {
  bucket: string;
  allocated: number;
  collected: number;
  achievement: number;
  accountCount: number;
}

export interface AgentPerformance {
  agentId: string;
  agentName: string;
  allocatedAccounts: number;
  collectedAmount: number;
  collectionPercentage: number;
  ptpCount: number;
  ptpAmount: number;
  keptPtp: number;
  brokenPtp: number;
  rank: number;
}

export interface TeamPerformance {
  teamId: string;
  teamLeaderName: string;
  teamSize: number;
  allocation: number;
  collection: number;
  achievement: number;
  rank: number;
}

export interface CustomerResult {
  id: string;
  customerName: string;
  mobileNumber: string;
  loanNumber: string;
  outstandingAmount: number;
  bucket: string;
  lastPaymentDate: string | null;
  lastFollowUp: string | null;
  latestRemark: string | null;
}

export interface FieldVisitRow {
  id: string;
  visitDate: string;
  customerName: string;
  loanNumber: string;
  agentName: string;
  customerMet: boolean;
  promiseToPay: boolean;
  ptpAmount: number | null;
  settlementInterest: boolean;
  remarks: string | null;
}

export interface SettlementRow {
  id: string;
  customerName: string;
  loanNumber: string;
  outstandingAmount: number;
  settlementAmount: number;
  requestDate: string;
  status: SettlementStatus;
}

export interface FilterOptions {
  agencies: { id: string; name: string }[];
  teams: { id: string; name: string }[];
  teamLeaders: { id: string; name: string }[];
  agents: { id: string; name: string }[];
  buckets: string[];
  states: string[];
  cities: string[];
  productTypes: string[];
}

export interface DashboardConfig {
  currency: string;
  dateFormat: string;
  showWeeklyTrend: boolean;
  showMonthlyTrend: boolean;
  kpiTargetPercent: number;
  dashboardTitle: string;
}

export interface AdminUserRow {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  tenant_id: string | null;
  agency_id: string | null;
  team_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface AccountOption {
  id: string;
  loanNumber: string;
  customerName: string;
  agentName: string;
}

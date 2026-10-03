-- =============================================================================
-- Migration 020: Bank / Agency Billing & Payout Module
-- Comprehensive schema for commercial payout logic, rule configuration,
-- resolution-driven billing calculations, approval workflows, and audit trail.
-- =============================================================================

CREATE TYPE public.billing_rule_type AS ENUM (
  'percentage',
  'fixed_per_resolution',
  'hybrid',
  'slab_amount',
  'slab_count',
  'bucket_tiered'
);

CREATE TYPE public.billing_approval_status AS ENUM (
  'pending_approval',
  'approved',
  'disputed',
  'held'
);

CREATE TYPE public.billing_payment_status AS ENUM (
  'unpaid',
  'processing',
  'paid'
);

-- Configurable billing rules table
CREATE TABLE IF NOT EXISTS public.billing_rules (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  name                    TEXT NOT NULL,
  description             TEXT,
  rule_type               public.billing_rule_type NOT NULL DEFAULT 'percentage',
  client_bank             TEXT DEFAULT 'All',
  product_type            TEXT DEFAULT 'All',
  bucket                  TEXT DEFAULT 'All',
  agency_name             TEXT DEFAULT 'All',
  
  percentage_rate         NUMERIC(5, 2) DEFAULT 0,
  fixed_amount            NUMERIC(15, 2) DEFAULT 0,
  slab_config             JSONB,
  bucket_multipliers      JSONB,
  min_recovery_threshold  NUMERIC(15, 2) DEFAULT 0,
  bonus_rate              NUMERIC(5, 2) DEFAULT 0,
  
  apply_gst               BOOLEAN NOT NULL DEFAULT TRUE,
  gst_rate                NUMERIC(5, 2) DEFAULT 18.00,
  apply_tds               BOOLEAN NOT NULL DEFAULT TRUE,
  tds_rate                NUMERIC(5, 2) DEFAULT 2.00,
  
  priority                INTEGER NOT NULL DEFAULT 10,
  is_active               BOOLEAN NOT NULL DEFAULT TRUE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Case resolution billing records & traceability
CREATE TABLE IF NOT EXISTS public.case_billing_records (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  account_id              UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  loan_number             TEXT NOT NULL,
  customer_name           TEXT NOT NULL,
  client_bank             TEXT NOT NULL,
  product_type            TEXT NOT NULL,
  bucket                  TEXT NOT NULL,
  agency_name             TEXT NOT NULL,
  team_leader_name        TEXT NOT NULL,
  agent_id                UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  agent_name              TEXT NOT NULL,
  
  resolution_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  resolution_amount       NUMERIC(15, 2) NOT NULL DEFAULT 0,
  resolution_type         TEXT NOT NULL DEFAULT 'settled',
  
  matched_rule_id         UUID REFERENCES public.billing_rules(id) ON DELETE SET NULL,
  matched_rule_name       TEXT NOT NULL,
  rule_type_applied       public.billing_rule_type NOT NULL,
  rate_formula_applied    TEXT NOT NULL,
  
  calculated_billing      NUMERIC(15, 2) NOT NULL DEFAULT 0,
  incentive_bonus         NUMERIC(15, 2) NOT NULL DEFAULT 0,
  deductions              NUMERIC(15, 2) NOT NULL DEFAULT 0,
  approved_billing        NUMERIC(15, 2) NOT NULL DEFAULT 0,
  
  gst_amount              NUMERIC(15, 2) NOT NULL DEFAULT 0,
  tds_amount              NUMERIC(15, 2) NOT NULL DEFAULT 0,
  net_payable             NUMERIC(15, 2) NOT NULL DEFAULT 0,
  
  approval_status         public.billing_approval_status NOT NULL DEFAULT 'pending_approval',
  payment_status          public.billing_payment_status NOT NULL DEFAULT 'unpaid',
  payment_reference       TEXT,
  payment_date            DATE,
  
  notes                   TEXT,
  approved_by             TEXT,
  approved_at             TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Billing audit trail logs
CREATE TABLE IF NOT EXISTS public.billing_audit_logs (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_id              UUID REFERENCES public.case_billing_records(id) ON DELETE CASCADE,
  action                  TEXT NOT NULL,
  performed_by            TEXT NOT NULL,
  previous_status         TEXT,
  new_status              TEXT,
  previous_amount         NUMERIC(15, 2),
  new_amount              NUMERIC(15, 2),
  change_reason           TEXT,
  metadata                JSONB,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_tenant_id ON public.case_billing_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_client_bank ON public.case_billing_records(client_bank);
CREATE INDEX IF NOT EXISTS idx_billing_product_type ON public.case_billing_records(product_type);
CREATE INDEX IF NOT EXISTS idx_billing_agency_name ON public.case_billing_records(agency_name);
CREATE INDEX IF NOT EXISTS idx_billing_team_leader ON public.case_billing_records(team_leader_name);
CREATE INDEX IF NOT EXISTS idx_billing_agent_id ON public.case_billing_records(agent_id);
CREATE INDEX IF NOT EXISTS idx_billing_resolution_date ON public.case_billing_records(resolution_date);
CREATE INDEX IF NOT EXISTS idx_billing_approval_status ON public.case_billing_records(approval_status);
CREATE INDEX IF NOT EXISTS idx_billing_payment_status ON public.case_billing_records(payment_status);
CREATE INDEX IF NOT EXISTS idx_billing_rules_tenant_id ON public.billing_rules(tenant_id);

ALTER TABLE public.billing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_billing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_rules_authenticated_read"
  ON public.billing_rules FOR SELECT TO authenticated USING (true);

CREATE POLICY "case_billing_records_authenticated_read"
  ON public.case_billing_records FOR SELECT TO authenticated USING (true);

CREATE POLICY "billing_audit_logs_authenticated_read"
  ON public.billing_audit_logs FOR SELECT TO authenticated USING (true);

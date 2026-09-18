-- =============================================================================
-- Collection & Recovery Dashboard – Initial Schema
-- Target: PostgreSQL 15+ / Supabase
-- Run in Supabase SQL Editor or via: supabase db push
-- =============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- ENUM TYPES
-- =============================================================================

CREATE TYPE public.user_role AS ENUM (
  'super_admin',
  'admin',
  'manager',
  'team_leader',
  'agent'
);

CREATE TYPE public.bucket_type AS ENUM (
  'B1',
  'B2',
  'B3',
  'B4',
  'B5',
  'B6_PLUS'
);

CREATE TYPE public.account_status AS ENUM (
  'allocated',
  'in_progress',
  'partially_collected',
  'fully_collected',
  'settled',
  'closed',
  'written_off'
);

CREATE TYPE public.ptp_status AS ENUM (
  'pending',
  'kept',
  'broken'
);

CREATE TYPE public.settlement_status AS ENUM (
  'pending',
  'approved',
  'rejected'
);

-- =============================================================================
-- SHARED TRIGGER: updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- =============================================================================
-- REFERENCE TABLES
-- =============================================================================

CREATE TABLE public.agencies (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  code          TEXT NOT NULL UNIQUE,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.teams (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id       UUID NOT NULL REFERENCES public.agencies(id) ON DELETE RESTRICT,
  name            TEXT NOT NULL,
  team_leader_id  UUID,  -- FK added after profiles exists
  manager_id      UUID,  -- FK added after profiles exists
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (agency_id, name)
);

-- =============================================================================
-- USERS (extends Supabase auth.users)
-- Roles: Admin, Manager, Team Leader, Agent
-- =============================================================================

CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL UNIQUE,
  full_name     TEXT NOT NULL,
  mobile        TEXT,
  role          public.user_role NOT NULL DEFAULT 'agent',
  agency_id     UUID REFERENCES public.agencies(id) ON DELETE SET NULL,
  team_id       UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  manager_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  employee_code TEXT UNIQUE,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT profiles_role_agency_check CHECK (
    NOT is_active
    OR role IN ('admin', 'super_admin')
    OR agency_id IS NOT NULL
  ),
  CONSTRAINT profiles_agent_team_check CHECK (
    NOT is_active
    OR role <> 'agent'
    OR team_id IS NOT NULL
  ),
  CONSTRAINT profiles_team_leader_team_check CHECK (
    NOT is_active
    OR role <> 'team_leader'
    OR team_id IS NOT NULL
  )
);

ALTER TABLE public.teams
  ADD CONSTRAINT teams_team_leader_id_fkey
  FOREIGN KEY (team_leader_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.teams
  ADD CONSTRAINT teams_manager_id_fkey
  FOREIGN KEY (manager_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_agency_id ON public.profiles(agency_id);
CREATE INDEX idx_profiles_team_id ON public.profiles(team_id);
CREATE INDEX idx_profiles_manager_id ON public.profiles(manager_id);

-- Auto-create profile row when a Supabase auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.user_role := 'agent';
  v_agency_id UUID := NULL;
  v_team_id UUID := NULL;
  v_is_active BOOLEAN := FALSE;
  v_is_first_user BOOLEAN;
BEGIN
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles LIMIT 1) INTO v_is_first_user;

  IF v_is_first_user THEN
    v_role := 'admin';
    v_is_active := TRUE;
  ELSIF NEW.raw_user_meta_data ? 'role' THEN
    BEGIN
      v_role := (NEW.raw_user_meta_data ->> 'role')::public.user_role;
    EXCEPTION
      WHEN invalid_text_representation THEN
        v_role := 'agent';
    END;
  END IF;

  IF NEW.raw_user_meta_data ? 'agency_id' THEN
    BEGIN
      v_agency_id := NULLIF(NEW.raw_user_meta_data ->> 'agency_id', '')::UUID;
    EXCEPTION
      WHEN invalid_text_representation THEN
        v_agency_id := NULL;
    END;
  END IF;

  IF NEW.raw_user_meta_data ? 'team_id' THEN
    BEGIN
      v_team_id := NULLIF(NEW.raw_user_meta_data ->> 'team_id', '')::UUID;
    EXCEPTION
      WHEN invalid_text_representation THEN
        v_team_id := NULL;
    END;
  END IF;

  IF NOT v_is_first_user THEN
    v_is_active := (
      v_role = 'admin'
      OR (
        v_agency_id IS NOT NULL
        AND (v_role NOT IN ('agent', 'team_leader') OR v_team_id IS NOT NULL)
      )
    );
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, agency_id, team_id, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    v_role,
    v_agency_id,
    v_team_id,
    v_is_active
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- CUSTOMERS
-- =============================================================================

CREATE TABLE public.customers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name     TEXT NOT NULL,
  mobile_number     TEXT NOT NULL,
  alternate_mobile  TEXT,
  email             TEXT,
  state             TEXT,
  city              TEXT,
  address           TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customers_mobile ON public.customers(mobile_number);
CREATE INDEX idx_customers_name ON public.customers(customer_name);
CREATE INDEX idx_customers_state_city ON public.customers(state, city);

-- =============================================================================
-- ACCOUNTS
-- Allocated accounts with outstanding, collection, and bucket (B1–B6+)
-- =============================================================================

CREATE TABLE public.accounts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_number         TEXT NOT NULL UNIQUE,
  customer_id         UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  agency_id           UUID NOT NULL REFERENCES public.agencies(id) ON DELETE RESTRICT,
  team_id             UUID NOT NULL REFERENCES public.teams(id) ON DELETE RESTRICT,
  assigned_agent_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  bucket              public.bucket_type NOT NULL,
  product_type        TEXT NOT NULL,
  state               TEXT,
  city                TEXT,
  allocated_at        DATE NOT NULL DEFAULT CURRENT_DATE,
  allocated_amount    NUMERIC(15, 2) NOT NULL CHECK (allocated_amount >= 0),
  outstanding_amount  NUMERIC(15, 2) NOT NULL CHECK (outstanding_amount >= 0),
  collected_amount    NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (collected_amount >= 0),
  last_payment_date   DATE,
  last_payment_amount NUMERIC(15, 2) CHECK (last_payment_amount IS NULL OR last_payment_amount >= 0),
  last_follow_up_at   TIMESTAMPTZ,
  latest_remark       TEXT,
  status              public.account_status NOT NULL DEFAULT 'allocated',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT accounts_collected_lte_outstanding CHECK (collected_amount <= outstanding_amount)
);

CREATE INDEX idx_accounts_customer_id ON public.accounts(customer_id);
CREATE INDEX idx_accounts_agency_id ON public.accounts(agency_id);
CREATE INDEX idx_accounts_team_id ON public.accounts(team_id);
CREATE INDEX idx_accounts_assigned_agent_id ON public.accounts(assigned_agent_id);
CREATE INDEX idx_accounts_bucket ON public.accounts(bucket);
CREATE INDEX idx_accounts_status ON public.accounts(status);
CREATE INDEX idx_accounts_allocated_at ON public.accounts(allocated_at);
CREATE INDEX idx_accounts_state_city ON public.accounts(state, city);
CREATE INDEX idx_accounts_product_type ON public.accounts(product_type);
CREATE INDEX idx_accounts_loan_number ON public.accounts(loan_number);

-- Individual payment records for collection trend analytics
CREATE TABLE public.collection_payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  agent_id        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  payment_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_amount  NUMERIC(15, 2) NOT NULL CHECK (payment_amount > 0),
  payment_mode    TEXT,
  reference_no    TEXT,
  remark          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_collection_payments_account_id ON public.collection_payments(account_id);
CREATE INDEX idx_collection_payments_agent_id ON public.collection_payments(agent_id);
CREATE INDEX idx_collection_payments_payment_date ON public.collection_payments(payment_date);

-- =============================================================================
-- PTP (Promise to Pay) TRACKING
-- =============================================================================

CREATE TABLE public.ptp_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  agent_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ptp_amount      NUMERIC(15, 2) NOT NULL CHECK (ptp_amount > 0),
  ptp_date        DATE NOT NULL,
  status          public.ptp_status NOT NULL DEFAULT 'pending',
  kept_at         TIMESTAMPTZ,
  broken_at       TIMESTAMPTZ,
  remark          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT ptp_kept_broken_exclusive CHECK (
    NOT (kept_at IS NOT NULL AND broken_at IS NOT NULL)
  ),
  CONSTRAINT ptp_status_timestamps_check CHECK (
    (status = 'pending' AND kept_at IS NULL AND broken_at IS NULL)
    OR (status = 'kept' AND kept_at IS NOT NULL AND broken_at IS NULL)
    OR (status = 'broken' AND broken_at IS NOT NULL AND kept_at IS NULL)
  )
);

CREATE INDEX idx_ptp_records_account_id ON public.ptp_records(account_id);
CREATE INDEX idx_ptp_records_agent_id ON public.ptp_records(agent_id);
CREATE INDEX idx_ptp_records_status ON public.ptp_records(status);
CREATE INDEX idx_ptp_records_ptp_date ON public.ptp_records(ptp_date);

-- =============================================================================
-- FIELD VISITS
-- =============================================================================

CREATE TABLE public.field_visits (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id          UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  agent_id            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  visit_date          DATE NOT NULL,
  customer_met        BOOLEAN NOT NULL DEFAULT FALSE,
  promise_to_pay      BOOLEAN NOT NULL DEFAULT FALSE,
  ptp_amount          NUMERIC(15, 2) CHECK (ptp_amount IS NULL OR ptp_amount > 0),
  settlement_interest BOOLEAN NOT NULL DEFAULT FALSE,
  remarks             TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT field_visits_ptp_amount_check_v2 CHECK (
    promise_to_pay = FALSE
    OR ptp_amount IS NOT NULL
  )
);

CREATE INDEX idx_field_visits_account_id ON public.field_visits(account_id);
CREATE INDEX idx_field_visits_agent_id ON public.field_visits(agent_id);
CREATE INDEX idx_field_visits_visit_date ON public.field_visits(visit_date);

-- Optional link: field visit that resulted in a formal PTP record
ALTER TABLE public.field_visits
  ADD COLUMN ptp_record_id UUID REFERENCES public.ptp_records(id) ON DELETE SET NULL;

CREATE INDEX idx_field_visits_ptp_record_id ON public.field_visits(ptp_record_id);

-- =============================================================================
-- SETTLEMENT TRACKER (from requirements §10)
-- =============================================================================

CREATE TABLE public.settlements (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id          UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  requested_by        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  approved_by         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  outstanding_amount  NUMERIC(15, 2) NOT NULL CHECK (outstanding_amount >= 0),
  settlement_amount   NUMERIC(15, 2) NOT NULL CHECK (settlement_amount >= 0),
  request_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  status              public.settlement_status NOT NULL DEFAULT 'pending',
  approved_at         TIMESTAMPTZ,
  rejection_reason    TEXT,
  remark              TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT settlements_amount_check CHECK (settlement_amount <= outstanding_amount)
);

CREATE INDEX idx_settlements_account_id ON public.settlements(account_id);
CREATE INDEX idx_settlements_status ON public.settlements(status);
CREATE INDEX idx_settlements_request_date ON public.settlements(request_date);

-- =============================================================================
-- updated_at TRIGGERS
-- =============================================================================

CREATE TRIGGER trg_agencies_updated_at
  BEFORE UPDATE ON public.agencies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_collection_payments_updated_at
  BEFORE UPDATE ON public.collection_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_ptp_records_updated_at
  BEFORE UPDATE ON public.ptp_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_field_visits_updated_at
  BEFORE UPDATE ON public.field_visits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_settlements_updated_at
  BEFORE UPDATE ON public.settlements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- HELPER VIEWS (dashboard KPIs & filters)
-- =============================================================================

CREATE OR REPLACE VIEW public.v_account_summary AS
SELECT
  a.id,
  a.loan_number,
  c.customer_name,
  c.mobile_number,
  a.agency_id,
  ag.name AS agency_name,
  a.team_id,
  t.name AS team_name,
  a.assigned_agent_id,
  p.full_name AS agent_name,
  a.bucket,
  a.product_type,
  a.state,
  a.city,
  a.allocated_at,
  a.allocated_amount,
  a.outstanding_amount,
  a.collected_amount,
  CASE
    WHEN a.allocated_amount = 0 THEN 0
    ELSE ROUND((a.collected_amount / a.allocated_amount) * 100, 2)
  END AS collection_percentage,
  a.last_payment_date,
  a.last_follow_up_at,
  a.latest_remark,
  a.status
FROM public.accounts a
JOIN public.customers c ON c.id = a.customer_id
JOIN public.agencies ag ON ag.id = a.agency_id
JOIN public.teams t ON t.id = a.team_id
JOIN public.profiles p ON p.id = a.assigned_agent_id;

CREATE OR REPLACE VIEW public.v_ptp_summary AS
SELECT
  pr.id,
  pr.account_id,
  a.loan_number,
  c.customer_name,
  pr.agent_id,
  ag.full_name AS agent_name,
  pr.ptp_amount,
  pr.ptp_date,
  pr.status,
  pr.kept_at,
  pr.broken_at,
  pr.remark,
  pr.created_at
FROM public.ptp_records pr
JOIN public.accounts a ON a.id = pr.account_id
JOIN public.customers c ON c.id = a.customer_id
JOIN public.profiles ag ON ag.id = pr.agent_id;

-- =============================================================================
-- ROW LEVEL SECURITY (enable; policies should be added per role in a follow-up migration)
-- =============================================================================

ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- NOTE: RLS on profiles blocks signup trigger. Run 002_fix_admin_user_creation.sql
-- or add INSERT policies before creating users in Authentication UI.
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ptp_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE public.profiles IS 'Application users linked to auth.users. Roles: admin, manager, team_leader, agent.';
COMMENT ON TABLE public.accounts IS 'Loan accounts allocated for collection with bucket (B1–B6+), outstanding, and collected amounts.';
COMMENT ON TABLE public.ptp_records IS 'Promise-to-Pay commitments with kept/broken/pending lifecycle.';
COMMENT ON TABLE public.field_visits IS 'Field visit history: customer met, PTP intent, settlement interest, remarks.';
COMMENT ON COLUMN public.accounts.bucket IS 'Delinquency bucket: B1 (least overdue) through B6_PLUS (most overdue).';
COMMENT ON COLUMN public.accounts.allocated_amount IS 'Principal/outstanding at time of allocation (denominator for achievement %).';
COMMENT ON COLUMN public.accounts.collected_amount IS 'Cumulative amount collected against this account.';

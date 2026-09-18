-- =============================================================================
-- Multi-tenant migration — run ONCE after 011a_multi_tenant_enum.sql succeeds.
-- Do NOT run 011_multi_tenant.sql from line 119 alone (tenant_id columns missing).
-- =============================================================================

-- 1. Tenant table
CREATE TABLE IF NOT EXISTS public.tenants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_is_active ON public.tenants(is_active);

DROP TRIGGER IF EXISTS tenants_set_updated_at ON public.tenants;
CREATE TRIGGER tenants_set_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.tenants (name, slug)
VALUES ('Default Client', 'default')
ON CONFLICT (slug) DO NOTHING;

-- 2. tenant_id columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE public.agencies ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_agency_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_agency_check CHECK (
    NOT is_active
    OR role IN ('admin', 'super_admin')
    OR agency_id IS NOT NULL
  );

-- 3. Backfill + promote first admin to super_admin
DO $$
DECLARE
  v_default UUID;
BEGIN
  SELECT id INTO v_default FROM public.tenants WHERE slug = 'default' LIMIT 1;
  IF v_default IS NULL THEN
    RAISE EXCEPTION 'Default tenant missing.';
  END IF;

  UPDATE public.agencies SET tenant_id = v_default WHERE tenant_id IS NULL;
  UPDATE public.customers SET tenant_id = v_default WHERE tenant_id IS NULL;
  UPDATE public.accounts SET tenant_id = v_default WHERE tenant_id IS NULL;
  UPDATE public.audit_logs SET tenant_id = v_default WHERE tenant_id IS NULL;
  UPDATE public.profiles SET tenant_id = v_default WHERE tenant_id IS NULL AND role::text <> 'super_admin';

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'super_admin') THEN
    UPDATE public.profiles
    SET role = 'super_admin'::public.user_role, tenant_id = NULL
    WHERE id = (
      SELECT id FROM public.profiles
      WHERE role = 'admin'::public.user_role
      ORDER BY created_at ASC
      LIMIT 1
    );
  END IF;
END $$;

ALTER TABLE public.agencies ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.customers ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.accounts ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE public.agencies DROP CONSTRAINT IF EXISTS agencies_code_key;
ALTER TABLE public.agencies DROP CONSTRAINT IF EXISTS agencies_tenant_code_unique;
ALTER TABLE public.agencies ADD CONSTRAINT agencies_tenant_code_unique UNIQUE (tenant_id, code);

ALTER TABLE public.accounts DROP CONSTRAINT IF EXISTS accounts_loan_number_key;
ALTER TABLE public.accounts DROP CONSTRAINT IF EXISTS accounts_tenant_loan_unique;
ALTER TABLE public.accounts ADD CONSTRAINT accounts_tenant_loan_unique UNIQUE (tenant_id, loan_number);

CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON public.profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agencies_tenant_id ON public.agencies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON public.customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_accounts_tenant_id ON public.accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON public.audit_logs(tenant_id);

-- 4. Per-tenant dashboard config
ALTER TABLE public.dashboard_config ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

UPDATE public.dashboard_config
SET tenant_id = (SELECT id FROM public.tenants WHERE slug = 'default' LIMIT 1)
WHERE tenant_id IS NULL;

ALTER TABLE public.dashboard_config ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE public.dashboard_config DROP CONSTRAINT IF EXISTS dashboard_config_pkey;
ALTER TABLE public.dashboard_config ADD PRIMARY KEY (tenant_id, id);

INSERT INTO public.dashboard_config (tenant_id, id, value)
SELECT t.id, 'display', '{"currency":"INR","dateFormat":"DD/MM/YYYY","showWeeklyTrend":true,"showMonthlyTrend":true,"kpiTargetPercent":75}'::jsonb
FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM public.dashboard_config dc WHERE dc.tenant_id = t.id AND dc.id = 'display'
);

INSERT INTO public.dashboard_config (tenant_id, id, value)
SELECT t.id, 'labels', '{"dashboardTitle":"Collection & Recovery Dashboard","agencyLabel":"Agency"}'::jsonb
FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM public.dashboard_config dc WHERE dc.tenant_id = t.id AND dc.id = 'labels'
);

-- 5. Replace 3-arg can_read_account from migration 008 with tenant-aware 4-arg version
-- Must drop dependent RLS policies first (from 008_role_scoped_rls.sql)
DROP POLICY IF EXISTS "scoped_select_accounts" ON public.accounts;
DROP POLICY IF EXISTS "scoped_select_customers" ON public.customers;
DROP POLICY IF EXISTS "scoped_select_collection_payments" ON public.collection_payments;
DROP POLICY IF EXISTS "scoped_select_ptp_records" ON public.ptp_records;

DROP FUNCTION IF EXISTS public.can_read_account(UUID, UUID, UUID);

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin' AND is_active = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active = TRUE AND tenant_id IS NOT NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin() OR public.is_tenant_admin();
$$;

CREATE OR REPLACE FUNCTION public.user_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.can_access_tenant(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin()
    OR (p_tenant_id IS NOT NULL AND public.user_tenant_id() = p_tenant_id);
$$;

CREATE OR REPLACE FUNCTION public.can_read_account(
  p_tenant_id UUID,
  p_agency_id UUID,
  p_team_id UUID,
  p_agent_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.can_access_tenant(p_tenant_id)
    AND CASE public.current_user_role()
      WHEN 'super_admin' THEN TRUE
      WHEN 'admin' THEN TRUE
      WHEN 'manager' THEN p_agency_id = public.user_agency_id()
      WHEN 'team_leader' THEN p_team_id = public.user_team_id()
      WHEN 'agent' THEN p_agent_id = auth.uid()
      ELSE FALSE
    END;
$$;

-- 6. Signup trigger with tenant assignment
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

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
  v_tenant_id UUID := NULL;
  v_is_active BOOLEAN := FALSE;
  v_is_first_user BOOLEAN;
  v_tenant_slug TEXT;
BEGIN
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles LIMIT 1) INTO v_is_first_user;

  IF v_is_first_user THEN
    v_role := 'super_admin';
    v_is_active := TRUE;
    v_tenant_id := NULL;
  ELSE
    v_tenant_slug := NULLIF(TRIM(NEW.raw_user_meta_data ->> 'tenant_slug'), '');
    IF v_tenant_slug IS NOT NULL THEN
      SELECT id INTO v_tenant_id
      FROM public.tenants
      WHERE slug = v_tenant_slug AND is_active = TRUE
      LIMIT 1;
    END IF;

    IF NEW.raw_user_meta_data ? 'tenant_id' THEN
      BEGIN
        v_tenant_id := COALESCE(
          v_tenant_id,
          NULLIF(NEW.raw_user_meta_data ->> 'tenant_id', '')::UUID
        );
      EXCEPTION WHEN invalid_text_representation THEN
        NULL;
      END;
    END IF;

    IF NEW.raw_user_meta_data ? 'role' THEN
      BEGIN
        v_role := (NEW.raw_user_meta_data ->> 'role')::public.user_role;
        IF v_role = 'super_admin' THEN
          v_role := 'agent';
        END IF;
      EXCEPTION WHEN invalid_text_representation THEN
        v_role := 'agent';
      END;
    END IF;

    IF NEW.raw_user_meta_data ? 'agency_id' THEN
      BEGIN
        v_agency_id := NULLIF(NEW.raw_user_meta_data ->> 'agency_id', '')::UUID;
      EXCEPTION WHEN invalid_text_representation THEN NULL;
      END;
    END IF;

    IF NEW.raw_user_meta_data ? 'team_id' THEN
      BEGIN
        v_team_id := NULLIF(NEW.raw_user_meta_data ->> 'team_id', '')::UUID;
      EXCEPTION WHEN invalid_text_representation THEN NULL;
      END;
    END IF;

    v_is_active := (
      v_role = 'admin'
      AND v_tenant_id IS NOT NULL
      AND (
        v_agency_id IS NOT NULL
        OR v_role = 'admin'
      )
      AND (v_role NOT IN ('agent', 'team_leader') OR v_team_id IS NOT NULL)
    );
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, agency_id, team_id, tenant_id, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    v_role,
    v_agency_id,
    v_team_id,
    v_tenant_id,
    v_is_active
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 7. RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin_all_tenants" ON public.tenants;
CREATE POLICY "super_admin_all_tenants"
  ON public.tenants FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "users_read_own_tenant" ON public.tenants;
CREATE POLICY "users_read_own_tenant"
  ON public.tenants FOR SELECT TO authenticated
  USING (id = public.user_tenant_id());

DROP POLICY IF EXISTS "scoped_select_profiles" ON public.profiles;
CREATE POLICY "scoped_select_profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR id = auth.uid()
    OR (tenant_id IS NOT NULL AND tenant_id = public.user_tenant_id() AND (
      public.current_user_role() IN ('admin', 'manager')
      OR (public.current_user_role() = 'team_leader' AND team_id = public.user_team_id())
    ))
  );

DROP POLICY IF EXISTS "admin_update_profiles" ON public.profiles;
CREATE POLICY "admin_update_profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR (public.is_tenant_admin() AND tenant_id = public.user_tenant_id())
  )
  WITH CHECK (
    public.is_super_admin()
    OR (public.is_tenant_admin() AND tenant_id = public.user_tenant_id() AND role <> 'super_admin')
  );

DROP POLICY IF EXISTS "scoped_select_accounts" ON public.accounts;
CREATE POLICY "scoped_select_accounts"
  ON public.accounts FOR SELECT TO authenticated
  USING (public.can_read_account(tenant_id, agency_id, team_id, assigned_agent_id));

DROP POLICY IF EXISTS "scoped_select_customers" ON public.customers;
CREATE POLICY "scoped_select_customers"
  ON public.customers FOR SELECT TO authenticated
  USING (
    public.can_access_tenant(tenant_id)
    AND (
      public.is_super_admin()
      OR public.current_user_role() = 'admin'
      OR EXISTS (
        SELECT 1 FROM public.accounts a
        WHERE a.customer_id = customers.id
          AND public.can_read_account(a.tenant_id, a.agency_id, a.team_id, a.assigned_agent_id)
      )
    )
  );

DROP POLICY IF EXISTS "scoped_select_collection_payments" ON public.collection_payments;
CREATE POLICY "scoped_select_collection_payments"
  ON public.collection_payments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = collection_payments.account_id
        AND public.can_read_account(a.tenant_id, a.agency_id, a.team_id, a.assigned_agent_id)
    )
  );

DROP POLICY IF EXISTS "scoped_select_ptp_records" ON public.ptp_records;
CREATE POLICY "scoped_select_ptp_records"
  ON public.ptp_records FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = ptp_records.account_id
        AND public.can_read_account(a.tenant_id, a.agency_id, a.team_id, a.assigned_agent_id)
    )
  );

DROP POLICY IF EXISTS "authenticated_select_agencies" ON public.agencies;
DROP POLICY IF EXISTS "scoped_select_agencies" ON public.agencies;
CREATE POLICY "scoped_select_agencies"
  ON public.agencies FOR SELECT TO authenticated
  USING (public.can_access_tenant(tenant_id));

DROP POLICY IF EXISTS "authenticated_select_teams" ON public.teams;
DROP POLICY IF EXISTS "scoped_select_teams" ON public.teams;
CREATE POLICY "scoped_select_teams"
  ON public.teams FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agencies ag
      WHERE ag.id = teams.agency_id AND public.can_access_tenant(ag.tenant_id)
    )
  );

DROP POLICY IF EXISTS "admin_insert_agencies" ON public.agencies;
CREATE POLICY "tenant_admin_insert_agencies"
  ON public.agencies FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (public.is_tenant_admin() AND tenant_id = public.user_tenant_id())
  );

DROP POLICY IF EXISTS "admin_insert_teams" ON public.teams;
CREATE POLICY "tenant_admin_insert_teams"
  ON public.teams FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_tenant_admin()
      AND EXISTS (
        SELECT 1 FROM public.agencies ag
        WHERE ag.id = agency_id AND ag.tenant_id = public.user_tenant_id()
      )
    )
  );

DROP POLICY IF EXISTS "admin_insert_customers" ON public.customers;
CREATE POLICY "tenant_admin_insert_customers"
  ON public.customers FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (public.is_tenant_admin() AND tenant_id = public.user_tenant_id())
  );

DROP POLICY IF EXISTS "admin_insert_accounts" ON public.accounts;
CREATE POLICY "tenant_admin_insert_accounts"
  ON public.accounts FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (public.is_tenant_admin() AND tenant_id = public.user_tenant_id())
  );

DROP POLICY IF EXISTS "admin_insert_collection_payments" ON public.collection_payments;
CREATE POLICY "tenant_admin_insert_collection_payments"
  ON public.collection_payments FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin() OR public.is_tenant_admin());

DROP POLICY IF EXISTS "authenticated_select_dashboard_config" ON public.dashboard_config;
DROP POLICY IF EXISTS "admin_all_dashboard_config" ON public.dashboard_config;
CREATE POLICY "scoped_select_dashboard_config"
  ON public.dashboard_config FOR SELECT TO authenticated
  USING (public.can_access_tenant(tenant_id));

CREATE POLICY "tenant_admin_dashboard_config"
  ON public.dashboard_config FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR (public.is_tenant_admin() AND tenant_id = public.user_tenant_id())
  )
  WITH CHECK (
    public.is_super_admin()
    OR (public.is_tenant_admin() AND tenant_id = public.user_tenant_id())
  );

DROP POLICY IF EXISTS "admin_select_audit_logs" ON public.audit_logs;
CREATE POLICY "scoped_select_audit_logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR (public.is_tenant_admin() AND tenant_id = public.user_tenant_id())
  );

COMMENT ON TABLE public.tenants IS 'Multi-tenant clients — each tenant data is isolated via tenant_id and RLS.';

-- 8. View with tenant_id
DROP VIEW IF EXISTS public.v_account_summary CASCADE;

CREATE VIEW public.v_account_summary AS
SELECT
  a.id,
  a.tenant_id,
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
LEFT JOIN public.teams t ON t.id = a.team_id
LEFT JOIN public.profiles p ON p.id = a.assigned_agent_id;

-- =============================================================================
-- Complete tenant column setup + view (run if 011 failed partway)
-- Prerequisites: 011a_multi_tenant_enum.sql already ran successfully
-- Do NOT run 011c alone — this file includes columns, backfill, and view.
-- After this succeeds, run section 8 of 011_multi_tenant.sql (dashboard_config),
-- then section 9 onward — OR run 011FINAL_run_after_011a.sql once (recommended).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.tenants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.tenants (name, slug)
VALUES ('Default Client', 'default')
ON CONFLICT (slug) DO NOTHING;

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

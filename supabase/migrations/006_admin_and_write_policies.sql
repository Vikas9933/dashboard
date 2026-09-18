-- =============================================================================
-- Admin helpers, write policies, and dashboard_config RLS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND is_active = TRUE
  );
$$;

-- Dashboard configuration (created here so 006 can run before 005 demo seed)
CREATE TABLE IF NOT EXISTS public.dashboard_config (
  id          TEXT PRIMARY KEY,
  value       JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

INSERT INTO public.dashboard_config (id, value)
VALUES
  (
    'display',
    '{"currency":"INR","dateFormat":"DD/MM/YYYY","showWeeklyTrend":true,"showMonthlyTrend":true,"kpiTargetPercent":75}'::jsonb
  ),
  (
    'labels',
    '{"dashboardTitle":"Collection & Recovery Dashboard","agencyLabel":"Agency"}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.dashboard_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_select_dashboard_config"
  ON public.dashboard_config FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_all_dashboard_config"
  ON public.dashboard_config FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "admin_update_profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "authenticated_insert_field_visits"
  ON public.field_visits FOR INSERT TO authenticated
  WITH CHECK (
    agent_id = auth.uid()
    OR public.is_admin()
  );

CREATE POLICY "admin_insert_customers"
  ON public.customers FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "admin_insert_accounts"
  ON public.accounts FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "admin_insert_collection_payments"
  ON public.collection_payments FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "admin_insert_agencies"
  ON public.agencies FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "admin_insert_teams"
  ON public.teams FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "authenticated_update_account_followup"
  ON public.accounts FOR UPDATE TO authenticated
  USING (assigned_agent_id = auth.uid() OR public.is_admin())
  WITH CHECK (assigned_agent_id = auth.uid() OR public.is_admin());

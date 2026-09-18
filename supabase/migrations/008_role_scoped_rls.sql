-- =============================================================================
-- Role-scoped RLS policies
-- =============================================================================

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.user_agency_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT agency_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.user_team_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT team_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.can_read_account(p_agency_id UUID, p_team_id UUID, p_agent_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE public.current_user_role()
    WHEN 'admin' THEN TRUE
    WHEN 'manager' THEN p_agency_id = public.user_agency_id()
    WHEN 'team_leader' THEN p_team_id = public.user_team_id()
    WHEN 'agent' THEN p_agent_id = auth.uid()
    ELSE FALSE
  END;
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_profiles" ON public.profiles;
DROP POLICY IF EXISTS "admin_update_profiles" ON public.profiles;

CREATE POLICY "scoped_select_profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR id = auth.uid()
    OR (public.current_user_role() = 'manager' AND agency_id = public.user_agency_id())
    OR (public.current_user_role() = 'team_leader' AND team_id = public.user_team_id())
  );

CREATE POLICY "admin_update_profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "authenticated_select_accounts" ON public.accounts;
CREATE POLICY "scoped_select_accounts"
  ON public.accounts FOR SELECT TO authenticated
  USING (public.can_read_account(agency_id, team_id, assigned_agent_id));

DROP POLICY IF EXISTS "authenticated_select_customers" ON public.customers;
CREATE POLICY "scoped_select_customers"
  ON public.customers FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.customer_id = customers.id
        AND public.can_read_account(a.agency_id, a.team_id, a.assigned_agent_id)
    )
  );

DROP POLICY IF EXISTS "authenticated_select_collection_payments" ON public.collection_payments;
CREATE POLICY "scoped_select_collection_payments"
  ON public.collection_payments FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = collection_payments.account_id
        AND public.can_read_account(a.agency_id, a.team_id, a.assigned_agent_id)
    )
  );

DROP POLICY IF EXISTS "authenticated_select_ptp_records" ON public.ptp_records;
CREATE POLICY "scoped_select_ptp_records"
  ON public.ptp_records FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = ptp_records.account_id
        AND public.can_read_account(a.agency_id, a.team_id, a.assigned_agent_id)
    )
  );

DROP POLICY IF EXISTS "authenticated_select_field_visits" ON public.field_visits;
CREATE POLICY "scoped_select_field_visits"
  ON public.field_visits FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR agent_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = field_visits.agent_id
        AND p.team_id = public.user_team_id()
        AND public.current_user_role() = 'team_leader'
    )
  );

DROP POLICY IF EXISTS "authenticated_select_settlements" ON public.settlements;
CREATE POLICY "scoped_select_settlements"
  ON public.settlements FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR public.current_user_role() IN ('manager', 'team_leader')
    OR EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = settlements.account_id
        AND a.assigned_agent_id = auth.uid()
    )
  );

CREATE POLICY "manager_admin_update_settlements"
  ON public.settlements FOR UPDATE TO authenticated
  USING (public.is_admin() OR public.current_user_role() = 'manager')
  WITH CHECK (public.is_admin() OR public.current_user_role() = 'manager');

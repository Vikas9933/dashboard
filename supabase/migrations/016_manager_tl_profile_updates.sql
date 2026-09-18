-- Allow supervisors and team leaders to approve/reject pending users in their client scope
DROP POLICY IF EXISTS "admin_update_profiles" ON public.profiles;
CREATE POLICY "admin_update_profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_tenant_admin()
      AND tenant_id IS NOT NULL
      AND tenant_id = public.user_tenant_id()
    )
    OR (
      public.current_user_role() = 'manager'
      AND tenant_id IS NOT NULL
      AND tenant_id = public.user_tenant_id()
      AND (
        is_active = FALSE
        OR agency_id = public.user_agency_id()
      )
    )
    OR (
      public.current_user_role() = 'team_leader'
      AND tenant_id IS NOT NULL
      AND tenant_id = public.user_tenant_id()
      AND (
        is_active = FALSE
        OR team_id = public.user_team_id()
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_tenant_admin()
      AND tenant_id IS NOT NULL
      AND tenant_id = public.user_tenant_id()
      AND role <> 'super_admin'
    )
    OR (
      public.current_user_role() = 'manager'
      AND tenant_id IS NOT NULL
      AND tenant_id = public.user_tenant_id()
      AND role NOT IN ('super_admin', 'admin')
      AND (
        is_active = FALSE
        OR agency_id = public.user_agency_id()
      )
    )
    OR (
      public.current_user_role() = 'team_leader'
      AND tenant_id IS NOT NULL
      AND tenant_id = public.user_tenant_id()
      AND role NOT IN ('super_admin', 'admin', 'manager')
      AND (
        is_active = FALSE
        OR team_id = public.user_team_id()
      )
    )
  );

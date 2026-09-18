-- =============================================================================
-- Tenant-scoped approvals: pending users only visible to their client admin
-- Run after 013_signup_public_access.sql
-- =============================================================================

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

    -- Non-platform users must belong to a client; otherwise stay pending for super_admin only
    v_is_active := (
      v_tenant_id IS NOT NULL
      AND v_role = 'admin'
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

-- Client admins only see profiles in their tenant (not other orgs, not unassigned)
DROP POLICY IF EXISTS "scoped_select_profiles" ON public.profiles;
CREATE POLICY "scoped_select_profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR id = auth.uid()
    OR (
      public.is_tenant_admin()
      AND tenant_id IS NOT NULL
      AND tenant_id = public.user_tenant_id()
    )
    OR (
      tenant_id IS NOT NULL
      AND tenant_id = public.user_tenant_id()
      AND public.current_user_role() = 'manager'
    )
    OR (
      tenant_id IS NOT NULL
      AND tenant_id = public.user_tenant_id()
      AND public.current_user_role() = 'team_leader'
      AND team_id = public.user_team_id()
    )
  );

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
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_tenant_admin()
      AND tenant_id IS NOT NULL
      AND tenant_id = public.user_tenant_id()
      AND role <> 'super_admin'
    )
  );

-- Assign tenant after OAuth signup when slug was stored in user metadata
CREATE OR REPLACE FUNCTION public.assign_profile_tenant(
  p_user_id UUID,
  p_tenant_slug TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  IF p_user_id IS NULL OR p_tenant_slug IS NULL OR TRIM(p_tenant_slug) = '' THEN
    RETURN FALSE;
  END IF;

  SELECT id INTO v_tenant_id
  FROM public.tenants
  WHERE slug = TRIM(LOWER(p_tenant_slug)) AND is_active = TRUE
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE public.profiles
  SET tenant_id = v_tenant_id
  WHERE id = p_user_id
    AND tenant_id IS NULL
    AND role <> 'super_admin';

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_profile_tenant(UUID, TEXT) TO authenticated;

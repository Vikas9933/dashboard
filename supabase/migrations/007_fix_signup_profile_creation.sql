-- =============================================================================
-- FIX: "Database error saving new user" on self-signup
-- Root cause: trigger inserted active agent/team_leader without agency/team,
-- violating profiles CHECK constraints.
-- =============================================================================

-- RLS blocks the auth trigger unless disabled or bypassed by owner
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

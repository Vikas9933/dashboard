-- =============================================================================
-- Signup: allow anonymous tenant lookup + bootstrap check without service role
-- Run after 011FINAL (and 012 if applied)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_platform_bootstrap()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles LIMIT 1);
$$;

GRANT EXECUTE ON FUNCTION public.is_platform_bootstrap() TO anon, authenticated;

DROP POLICY IF EXISTS "anon_read_active_tenants_for_signup" ON public.tenants;
CREATE POLICY "anon_read_active_tenants_for_signup"
  ON public.tenants FOR SELECT TO anon, authenticated
  USING (is_active = TRUE);

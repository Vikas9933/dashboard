-- Run this ONLY if 011_multi_tenant.sql failed on profiles_role_agency_check
-- Then re-run the full 011_multi_tenant.sql

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_agency_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_agency_check CHECK (
    NOT is_active
    OR role IN ('admin', 'super_admin')
    OR agency_id IS NOT NULL
  );

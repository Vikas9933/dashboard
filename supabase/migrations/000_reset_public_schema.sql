-- =============================================================================
-- RESET — wipe all app tables and start fresh
--
-- WARNING: Deletes ALL data in public schema (accounts, profiles, tenants, etc.)
-- auth.users are kept by default — delete them in Supabase Auth UI if you want
-- a completely clean signup flow.
--
-- AFTER THIS FILE SUCCEEDS, run each migration below IN ORDER (one file at a
-- time in Supabase SQL Editor):
--
--   1.  001_initial_schema.sql
--   2.  002_fix_admin_user_creation.sql
--   3.  004_rls_authenticated_read.sql
--   4.  006_admin_and_write_policies.sql
--   5.  007_fix_signup_profile_creation.sql
--   6.  008_role_scoped_rls.sql
--   7.  009_audit_logs.sql
--   8.  005_reference_data_and_demo.sql   (optional — skip for empty DB)
--   9.  010_expand_demo_to_1000.sql       (optional — skip unless you ran 005)
--  10.  011a_multi_tenant_enum.sql
--  11.  011FINAL_run_after_011a.sql
--  12.  012_platform_subscriptions.sql
--  13.  013_signup_public_access.sql
--  14.  014_tenant_scoped_approvals.sql
--  15.  015_signup_notification_tracking.sql
--  16.  016_manager_tl_profile_updates.sql
--  17.  017_subscription_tiers_standard_pro_enterprise.sql
--  18.  018_subscription_saas_system.sql
--
-- Skip 003_seed_sample_data.sql (superseded by 005).
-- Skip 011_multi_tenant.sql (use 011FINAL instead).
-- Run 011b/011c/011d only if a step above fails with a specific error.
--
-- Then sign up in the app (first user becomes super_admin via 011FINAL trigger).
-- Re-run 005 and 010 after signup if you want demo data (750+ accounts).
-- =============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DROP SCHEMA IF EXISTS public CASCADE;

CREATE SCHEMA public;

GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;

-- Optional: uncomment to remove all auth users too (cannot undo)
-- DELETE FROM auth.users;

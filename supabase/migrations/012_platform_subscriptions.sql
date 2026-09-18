-- =============================================================================
-- Platform: subscription plans, tenant limits, feature flags
-- Run after 011FINAL_run_after_011a.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  description     TEXT,
  max_users       INT NOT NULL DEFAULT 10 CHECK (max_users > 0),
  max_storage_mb  INT NOT NULL DEFAULT 1024 CHECK (max_storage_mb > 0),
  features        JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS subscription_plans_set_updated_at ON public.subscription_plans;
CREATE TRIGGER subscription_plans_set_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.subscription_plans (code, name, description, max_users, max_storage_mb, features)
VALUES
  (
    'starter',
    'Starter',
    'Basic collection dashboard for small teams',
    10,
    512,
    '{"export":true,"upload":true,"settlements":true,"audit":false,"field_visits":true}'::jsonb
  ),
  (
    'professional',
    'Professional',
    'Full operational toolkit with audit trail',
    50,
    2048,
    '{"export":true,"upload":true,"settlements":true,"audit":true,"field_visits":true}'::jsonb
  ),
  (
    'enterprise',
    'Enterprise',
    'High limits and all platform features',
    500,
    10240,
    '{"export":true,"upload":true,"settlements":true,"audit":true,"field_visits":true,"api":true}'::jsonb
  )
ON CONFLICT (code) DO NOTHING;

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS subscription_plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS max_users INT CHECK (max_users IS NULL OR max_users > 0),
  ADD COLUMN IF NOT EXISTS max_storage_mb INT CHECK (max_storage_mb IS NULL OR max_storage_mb > 0),
  ADD COLUMN IF NOT EXISTS feature_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS storage_used_mb INT NOT NULL DEFAULT 0 CHECK (storage_used_mb >= 0);

UPDATE public.tenants t
SET subscription_plan_id = sp.id
FROM public.subscription_plans sp
WHERE t.subscription_plan_id IS NULL
  AND sp.code = 'starter';

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin_all_subscription_plans" ON public.subscription_plans;
CREATE POLICY "super_admin_all_subscription_plans"
  ON public.subscription_plans FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "authenticated_read_subscription_plans" ON public.subscription_plans;
CREATE POLICY "authenticated_read_subscription_plans"
  ON public.subscription_plans FOR SELECT TO authenticated
  USING (is_active = TRUE);

COMMENT ON TABLE public.subscription_plans IS 'Platform subscription tiers with default limits and feature bundles.';
COMMENT ON COLUMN public.tenants.feature_flags IS 'Per-client feature overrides (merged with plan features in app).';
COMMENT ON COLUMN public.tenants.max_users IS 'User seat limit override; falls back to plan when NULL.';

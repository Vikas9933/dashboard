-- =============================================================================
-- Subscription tiers: Standard, Pro, Enterprise (features configured later)
-- Run after 012_platform_subscriptions.sql when possible.
-- Bootstraps subscription_plans + tenant columns if 012 was skipped.
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

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS subscription_plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS max_users INT CHECK (max_users IS NULL OR max_users > 0),
  ADD COLUMN IF NOT EXISTS max_storage_mb INT CHECK (max_storage_mb IS NULL OR max_storage_mb > 0),
  ADD COLUMN IF NOT EXISTS feature_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS storage_used_mb INT NOT NULL DEFAULT 0 CHECK (storage_used_mb >= 0);

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

INSERT INTO public.subscription_plans (code, name, description, max_users, max_storage_mb, features)
VALUES
  (
    'standard',
    'Standard',
    'Entry tier for growing collection teams.',
    25,
    1024,
    '{}'::jsonb
  ),
  (
    'pro',
    'Pro',
    'Advanced tier for multi-agency operations.',
    100,
    5120,
    '{}'::jsonb
  ),
  (
    'enterprise',
    'Enterprise',
    'Full platform tier for large organizations.',
    500,
    20480,
    '{}'::jsonb
  )
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  max_users = EXCLUDED.max_users,
  max_storage_mb = EXCLUDED.max_storage_mb,
  features = '{}'::jsonb,
  is_active = TRUE,
  updated_at = NOW();

-- Migrate clients off legacy plan codes if present
UPDATE public.tenants t
SET subscription_plan_id = sp_new.id
FROM public.subscription_plans sp_old
JOIN public.subscription_plans sp_new ON sp_new.code = 'standard'
WHERE t.subscription_plan_id = sp_old.id
  AND sp_old.code = 'starter';

UPDATE public.tenants t
SET subscription_plan_id = sp_new.id
FROM public.subscription_plans sp_old
JOIN public.subscription_plans sp_new ON sp_new.code = 'pro'
WHERE t.subscription_plan_id = sp_old.id
  AND sp_old.code = 'professional';

UPDATE public.tenants t
SET subscription_plan_id = sp.id
FROM public.subscription_plans sp
WHERE t.subscription_plan_id IS NULL
  AND sp.code = 'standard';

UPDATE public.tenants t
SET subscription_plan_id = sp.id
FROM public.subscription_plans sp
WHERE t.subscription_plan_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.subscription_plans p
    WHERE p.id = t.subscription_plan_id AND p.is_active = TRUE
  )
  AND sp.code = 'standard';

-- Retire legacy tiers (keep rows for history / FK safety)
UPDATE public.subscription_plans
SET is_active = FALSE, updated_at = NOW()
WHERE code IN ('starter', 'professional');

COMMENT ON TABLE public.subscription_plans IS
  'Platform tiers: standard, pro, enterprise. Feature bundles in features JSONB (TBD).';

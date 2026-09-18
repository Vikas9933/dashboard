-- =============================================================================
-- SaaS subscription system: plan status, usage tracking, feature config seeds
-- Maps organization_id → tenants.id (existing multi-tenant model)
-- Run after 017_subscription_tiers_standard_pro_enterprise.sql
-- =============================================================================

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS plan_status TEXT NOT NULL DEFAULT 'active'
    CHECK (plan_status IN ('active', 'trial', 'past_due', 'cancelled', 'suspended'));

COMMENT ON COLUMN public.tenants.plan_status IS
  'Billing lifecycle status for the client organization (tenant).';

CREATE TABLE IF NOT EXISTS public.organization_usage (
  tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  current_user_count INT NOT NULL DEFAULT 0 CHECK (current_user_count >= 0),
  current_storage_used_mb INT NOT NULL DEFAULT 0 CHECK (current_storage_used_mb >= 0),
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.organization_usage IS
  'Usage counters per organization (tenant_id). Synced from profiles and storage.';

-- Standard tier features
UPDATE public.subscription_plans
SET features = '{
  "user_management": true,
  "dashboard": true,
  "customer_management": true,
  "allocation_module": true,
  "ptp_tracking": true,
  "collection_tracking": true,
  "basic_reports": true,
  "excel_export": true,
  "search_filters": true
}'::jsonb,
updated_at = NOW()
WHERE code = 'standard';

-- Pro = Standard + Pro features
UPDATE public.subscription_plans
SET features = '{
  "user_management": true,
  "dashboard": true,
  "customer_management": true,
  "allocation_module": true,
  "ptp_tracking": true,
  "collection_tracking": true,
  "basic_reports": true,
  "excel_export": true,
  "search_filters": true,
  "advanced_analytics": true,
  "target_vs_achievement": true,
  "supervisor_performance": true,
  "team_leader_performance": true,
  "agent_performance": true,
  "settlement_tracking": true,
  "agency_performance": true,
  "audit_logs": true,
  "advanced_filters": true,
  "dashboard_customization": true,
  "email_notifications": true,
  "whatsapp_integration": true
}'::jsonb,
updated_at = NOW()
WHERE code = 'pro';

-- Enterprise = Pro + Enterprise features
UPDATE public.subscription_plans
SET features = '{
  "user_management": true,
  "dashboard": true,
  "customer_management": true,
  "allocation_module": true,
  "ptp_tracking": true,
  "collection_tracking": true,
  "basic_reports": true,
  "excel_export": true,
  "search_filters": true,
  "advanced_analytics": true,
  "target_vs_achievement": true,
  "supervisor_performance": true,
  "team_leader_performance": true,
  "agent_performance": true,
  "settlement_tracking": true,
  "agency_performance": true,
  "audit_logs": true,
  "advanced_filters": true,
  "dashboard_customization": true,
  "email_notifications": true,
  "whatsapp_integration": true,
  "api_integration": true,
  "crm_integration": true,
  "collection_system_integration": true,
  "auto_data_sync": true,
  "webhooks": true,
  "custom_workflows": true,
  "white_label": true,
  "dedicated_database": true,
  "custom_reports_modules": true
}'::jsonb,
updated_at = NOW()
WHERE code = 'enterprise';

CREATE OR REPLACE FUNCTION public.sync_organization_usage(p_tenant_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_users INT;
  v_storage INT;
BEGIN
  IF p_tenant_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COUNT(*)::INT INTO v_users
  FROM public.profiles
  WHERE tenant_id = p_tenant_id
    AND role::text <> 'super_admin';

  SELECT COALESCE(storage_used_mb, 0) INTO v_storage
  FROM public.tenants
  WHERE id = p_tenant_id;

  INSERT INTO public.organization_usage (tenant_id, current_user_count, current_storage_used_mb, last_updated)
  VALUES (p_tenant_id, v_users, v_storage, NOW())
  ON CONFLICT (tenant_id) DO UPDATE SET
    current_user_count = EXCLUDED.current_user_count,
    current_storage_used_mb = EXCLUDED.current_storage_used_mb,
    last_updated = NOW();
END;
$$;

-- Backfill usage for all tenants
INSERT INTO public.organization_usage (tenant_id, current_user_count, current_storage_used_mb, last_updated)
SELECT
  t.id,
  (SELECT COUNT(*)::INT FROM public.profiles p WHERE p.tenant_id = t.id AND p.role::text <> 'super_admin'),
  COALESCE(t.storage_used_mb, 0),
  NOW()
FROM public.tenants t
ON CONFLICT (tenant_id) DO UPDATE SET
  current_user_count = EXCLUDED.current_user_count,
  current_storage_used_mb = EXCLUDED.current_storage_used_mb,
  last_updated = NOW();

GRANT EXECUTE ON FUNCTION public.sync_organization_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_organization_usage(UUID) TO service_role;

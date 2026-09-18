-- =============================================================================
-- Recreate v_account_summary AFTER tenant_id exists on accounts
-- Run ONLY after 011d_tenant_columns_and_view.sql or full 011_multi_tenant.sql
-- =============================================================================

DROP VIEW IF EXISTS public.v_account_summary CASCADE;

CREATE VIEW public.v_account_summary AS
SELECT
  a.id,
  a.tenant_id,
  a.loan_number,
  c.customer_name,
  c.mobile_number,
  a.agency_id,
  ag.name AS agency_name,
  a.team_id,
  t.name AS team_name,
  a.assigned_agent_id,
  p.full_name AS agent_name,
  a.bucket,
  a.product_type,
  a.state,
  a.city,
  a.allocated_at,
  a.allocated_amount,
  a.outstanding_amount,
  a.collected_amount,
  CASE
    WHEN a.allocated_amount = 0 THEN 0
    ELSE ROUND((a.collected_amount / a.allocated_amount) * 100, 2)
  END AS collection_percentage,
  a.last_payment_date,
  a.last_follow_up_at,
  a.latest_remark,
  a.status
FROM public.accounts a
JOIN public.customers c ON c.id = a.customer_id
JOIN public.agencies ag ON ag.id = a.agency_id
LEFT JOIN public.teams t ON t.id = a.team_id
LEFT JOIN public.profiles p ON p.id = a.assigned_agent_id;

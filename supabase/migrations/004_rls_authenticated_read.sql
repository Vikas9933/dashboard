-- =============================================================================
-- RLS policies: allow authenticated users to read dashboard data
-- Run this in Supabase SQL Editor after login/dashboard is deployed
-- =============================================================================

CREATE POLICY "authenticated_select_agencies"
  ON public.agencies FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_select_teams"
  ON public.teams FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_select_profiles"
  ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_select_customers"
  ON public.customers FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_select_accounts"
  ON public.accounts FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_select_collection_payments"
  ON public.collection_payments FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_select_ptp_records"
  ON public.ptp_records FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_select_field_visits"
  ON public.field_visits FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_select_settlements"
  ON public.settlements FOR SELECT TO authenticated USING (true);

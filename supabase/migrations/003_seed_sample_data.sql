-- =============================================================================
-- Sample data for Collection & Recovery Dashboard demo
-- Safe to re-run: uses ON CONFLICT where applicable
-- =============================================================================

DO $$
DECLARE
  v_agency_id UUID;
  v_team_id   UUID;
  v_admin_id  UUID;
  v_status    public.ptp_status;
BEGIN
  SELECT id INTO v_agency_id FROM public.agencies WHERE code = 'DA001' LIMIT 1;
  SELECT id INTO v_team_id   FROM public.teams WHERE agency_id = v_agency_id LIMIT 1;
  SELECT id INTO v_admin_id  FROM public.profiles WHERE role = 'admin' LIMIT 1;

  IF v_agency_id IS NULL OR v_team_id IS NULL OR v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Missing agency, team, or admin. Run admin setup first.';
  END IF;

  INSERT INTO public.customers (customer_name, mobile_number, state, city)
  VALUES
    ('Rahul Sharma',  '9876543210', 'Maharashtra', 'Mumbai'),
    ('Priya Patel',   '9876543211', 'Gujarat',     'Ahmedabad'),
    ('Amit Kumar',    '9876543212', 'Delhi',       'New Delhi'),
    ('Sneha Reddy',   '9876543213', 'Telangana',   'Hyderabad'),
    ('Vikram Singh',  '9876543214', 'Punjab',      'Chandigarh')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.accounts (
    loan_number, customer_id, agency_id, team_id, assigned_agent_id,
    bucket, product_type, state, city,
    allocated_amount, outstanding_amount, collected_amount, status
  )
  SELECT
    'LN-' || LPAD(g.i::text, 5, '0'),
    c.id,
    v_agency_id,
    v_team_id,
    v_admin_id,
    (ARRAY['B1','B2','B3','B4','B5','B6_PLUS'])[1 + (g.i % 6)]::public.bucket_type,
    CASE WHEN g.i % 2 = 0 THEN 'Personal Loan' ELSE 'Business Loan' END,
    c.state,
    c.city,
    30000 + (g.i * 2000),
    30000 + (g.i * 2000),
    (g.i * 800),
    'allocated'
  FROM generate_series(1, 50) AS g(i)
  CROSS JOIN LATERAL (
    SELECT id, state, city FROM public.customers ORDER BY random() LIMIT 1
  ) c
  ON CONFLICT (loan_number) DO NOTHING;

  INSERT INTO public.collection_payments (account_id, agent_id, payment_date, payment_amount, payment_mode)
  SELECT
    a.id,
    v_admin_id,
    CURRENT_DATE - (g.i % 30),
    1000 + (g.i * 100),
    CASE WHEN g.i % 3 = 0 THEN 'UPI' WHEN g.i % 3 = 1 THEN 'Cash' ELSE 'NEFT' END
  FROM generate_series(1, 80) AS g(i)
  CROSS JOIN LATERAL (
    SELECT id FROM public.accounts ORDER BY random() LIMIT 1
  ) a;

  -- PTP: kept/broken rows must include kept_at / broken_at (constraint requirement)
  FOR g IN 1..20 LOOP
    v_status := (ARRAY['pending','kept','broken']::public.ptp_status[])[1 + (g % 3)];

    INSERT INTO public.ptp_records (
      account_id, agent_id, ptp_amount, ptp_date, status, kept_at, broken_at
    )
    SELECT
      a.id,
      v_admin_id,
      5000 + (g * 500),
      CURRENT_DATE + (g % 14),
      v_status,
      CASE WHEN v_status = 'kept'   THEN NOW() - INTERVAL '2 days' ELSE NULL END,
      CASE WHEN v_status = 'broken' THEN NOW() - INTERVAL '1 day'  ELSE NULL END
    FROM (
      SELECT id FROM public.accounts ORDER BY random() LIMIT 1
    ) a;
  END LOOP;

  INSERT INTO public.field_visits (
    account_id, agent_id, visit_date, customer_met,
    promise_to_pay, ptp_amount, settlement_interest, remarks
  )
  SELECT
    a.id,
    v_admin_id,
    CURRENT_DATE - (g.i % 20),
    g.i % 3 <> 0,
    g.i % 4 = 0,
    CASE WHEN g.i % 4 = 0 THEN 3000 + g.i * 200 ELSE NULL END,
    g.i % 5 = 0,
    'Visit remark #' || g.i
  FROM generate_series(1, 15) AS g(i)
  CROSS JOIN LATERAL (
    SELECT id FROM public.accounts ORDER BY random() LIMIT 1
  ) a;

END $$;

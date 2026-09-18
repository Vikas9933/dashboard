-- =============================================================================
-- Expand demo dataset from 750 to 1000 accounts
-- =============================================================================

DO $$
DECLARE
  v_agency_n UUID;
  v_team_n   UUID;
  v_agent_id UUID;
  v_existing INT;
  v_needed   INT;
  v_status   public.ptp_status;
  v_i        INT;
BEGIN
  SELECT id INTO v_agency_n FROM public.agencies WHERE code = 'DA001' LIMIT 1;
  SELECT id INTO v_team_n FROM public.teams WHERE name = 'North Team Alpha' LIMIT 1;
  SELECT id INTO v_agent_id
  FROM public.profiles
  WHERE role IN ('agent', 'admin', 'super_admin') AND is_active = TRUE
  ORDER BY CASE WHEN role = 'agent' THEN 0 ELSE 1 END
  LIMIT 1;

  IF v_agency_n IS NULL OR v_team_n IS NULL OR v_agent_id IS NULL THEN
    RAISE NOTICE 'Skipping demo expansion: ensure admin, agency, and team exist.';
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_existing FROM public.accounts;
  v_needed := GREATEST(0, 1000 - v_existing);

  IF v_needed = 0 THEN
    RAISE NOTICE 'Demo accounts already at or above 1000.';
    RETURN;
  END IF;

  INSERT INTO public.customers (customer_name, mobile_number, state, city)
  SELECT
    'Demo Customer ' || (v_existing + gs.i),
    '9' || LPAD((v_existing + gs.i)::TEXT, 9, '0'),
    (ARRAY['Maharashtra','Karnataka','Tamil Nadu','Gujarat','Delhi'])[1 + (gs.i % 5)],
    (ARRAY['Mumbai','Bengaluru','Chennai','Ahmedabad','New Delhi'])[1 + (gs.i % 5)]
  FROM generate_series(1, v_needed) AS gs(i);

  INSERT INTO public.accounts (
    loan_number, customer_id, agency_id, team_id, assigned_agent_id,
    bucket, product_type, state, city,
    allocated_amount, outstanding_amount, collected_amount, status
  )
  SELECT
    'LN-DEMO-' || LPAD((v_existing + gs.i)::TEXT, 6, '0'),
    c.id,
    v_agency_n,
    v_team_n,
    v_agent_id,
    (ARRAY['B1','B2','B3','B4','B5','B6_PLUS']::public.bucket_type[])[1 + (gs.i % 6)],
    (ARRAY['Personal Loan','Home Loan','Auto Loan','Credit Card'])[1 + (gs.i % 4)],
    c.state,
    c.city,
    20000 + (gs.i % 80) * 1000,
    GREATEST(5000, 20000 + (gs.i % 80) * 1000 - (gs.i % 50) * 500),
    LEAST(
      (gs.i % 50) * 500,
      GREATEST(5000, 20000 + (gs.i % 80) * 1000 - (gs.i % 50) * 500)
    ),
    'allocated'
  FROM generate_series(1, v_needed) AS gs(i)
  JOIN public.customers c ON c.mobile_number = '9' || LPAD((v_existing + gs.i)::TEXT, 9, '0');

  INSERT INTO public.collection_payments (account_id, payment_date, payment_amount, payment_mode)
  SELECT
    a.id,
    CURRENT_DATE - ((gs.i % 90) || ' days')::INTERVAL,
    500 + (gs.i % 20) * 250,
    (ARRAY['UPI','NEFT','Cash','Cheque'])[1 + (gs.i % 4)]
  FROM generate_series(1, v_needed) AS gs(i)
  JOIN public.accounts a ON a.loan_number = 'LN-DEMO-' || LPAD((v_existing + gs.i)::TEXT, 6, '0');

  FOR v_i IN 1..LEAST(v_needed, 200) LOOP
    v_status := (ARRAY['pending','kept','broken']::public.ptp_status[])[1 + (v_i % 3)];
    INSERT INTO public.ptp_records (
      account_id, agent_id, ptp_amount, ptp_date, status, kept_at, broken_at
    )
    SELECT
      a.id,
      v_agent_id,
      2000 + (v_i % 10) * 500,
      CURRENT_DATE + ((v_i % 14) || ' days')::INTERVAL,
      v_status,
      CASE WHEN v_status = 'kept' THEN NOW() - INTERVAL '3 days' ELSE NULL END,
      CASE WHEN v_status = 'broken' THEN NOW() - INTERVAL '2 days' ELSE NULL END
    FROM public.accounts a
    WHERE a.loan_number = 'LN-DEMO-' || LPAD((v_existing + v_i)::TEXT, 6, '0');
  END LOOP;

  RAISE NOTICE 'Added % demo accounts (target 1000 total).', v_needed;
END $$;

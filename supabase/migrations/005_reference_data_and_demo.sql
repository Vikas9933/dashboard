-- =============================================================================
-- Reference data, dashboard config, and expanded demo dataset (750 accounts)
-- Safe to re-run where noted with ON CONFLICT / conditional checks
-- =============================================================================

INSERT INTO public.agencies (name, code)
VALUES
  ('Demo Agency North', 'DA001'),
  ('Demo Agency South', 'DA002')
ON CONFLICT (code) DO NOTHING;

-- Dashboard configuration (§12)
CREATE TABLE IF NOT EXISTS public.dashboard_config (
  id          TEXT PRIMARY KEY,
  value       JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

INSERT INTO public.dashboard_config (id, value)
VALUES
  (
    'display',
    '{"currency":"INR","dateFormat":"DD/MM/YYYY","showWeeklyTrend":true,"showMonthlyTrend":true,"kpiTargetPercent":75}'::jsonb
  ),
  (
    'labels',
    '{"dashboardTitle":"Collection & Recovery Dashboard","agencyLabel":"Agency"}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE
  v_agency_n UUID;
  v_agency_s UUID;
  v_team_n   UUID;
  v_team_s   UUID;
  v_admin_id UUID;
  v_agent_id UUID;
  v_existing INT;
  v_needed   INT;
  v_status   public.ptp_status;
  g          INT;
BEGIN
  SELECT id INTO v_agency_n FROM public.agencies WHERE code = 'DA001' LIMIT 1;
  SELECT id INTO v_agency_s FROM public.agencies WHERE code = 'DA002' LIMIT 1;
  SELECT id INTO v_admin_id FROM public.profiles WHERE role IN ('admin', 'super_admin') LIMIT 1;

  IF v_agency_n IS NULL OR v_admin_id IS NULL THEN
    RAISE NOTICE 'Skipping demo expansion: create an admin user first, then re-run this migration.';
    RETURN;
  END IF;

  INSERT INTO public.teams (agency_id, name)
  VALUES
    (v_agency_n, 'North Team Alpha'),
    (v_agency_n, 'North Team Beta'),
    (v_agency_s, 'South Team Gamma')
  ON CONFLICT (agency_id, name) DO NOTHING;

  SELECT id INTO v_team_n FROM public.teams WHERE agency_id = v_agency_n AND name = 'North Team Alpha' LIMIT 1;
  SELECT id INTO v_team_s FROM public.teams WHERE agency_id = v_agency_s AND name = 'South Team Gamma' LIMIT 1;
  v_team_s := COALESCE(v_team_s, v_team_n);

  SELECT id INTO v_agent_id
  FROM public.profiles
  WHERE role IN ('agent', 'admin') AND is_active = TRUE
  ORDER BY CASE WHEN role = 'agent' THEN 0 ELSE 1 END
  LIMIT 1;

  v_agent_id := COALESCE(v_agent_id, v_admin_id);

  SELECT COUNT(*) INTO v_existing FROM public.accounts;
  v_needed := GREATEST(0, 750 - v_existing);

  IF v_needed = 0 THEN
    RAISE NOTICE 'Demo accounts already at or above 750.';
  ELSE
    INSERT INTO public.customers (customer_name, mobile_number, state, city)
    SELECT
      (ARRAY[
        'Rahul Sharma','Priya Patel','Amit Kumar','Sneha Reddy','Vikram Singh',
        'Anita Desai','Karan Mehta','Deepa Nair','Rohit Gupta','Meera Iyer',
        'Arjun Joshi','Kavita Rao','Sanjay Pillai','Neha Kapoor','Manish Shah'
      ])[1 + ((g.i - 1) % 15)],
      '98' || LPAD(((7000000000 + g.i)::bigint % 1000000000)::text, 8, '0'),
      (ARRAY['Maharashtra','Gujarat','Delhi','Telangana','Karnataka','Tamil Nadu','Punjab','Rajasthan'])[1 + (g.i % 8)],
      (ARRAY['Mumbai','Ahmedabad','New Delhi','Hyderabad','Bengaluru','Chennai','Chandigarh','Jaipur'])[1 + (g.i % 8)]
    FROM generate_series(1, v_needed) AS g(i)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.accounts (
      loan_number, customer_id, agency_id, team_id, assigned_agent_id,
      bucket, product_type, state, city,
      allocated_amount, outstanding_amount, collected_amount,
      last_payment_date, last_follow_up_at, latest_remark, status
    )
    SELECT
      'LN-' || LPAD((v_existing + g.i)::text, 6, '0'),
      c.id,
      CASE WHEN g.i % 5 = 0 THEN v_agency_s ELSE v_agency_n END,
      CASE WHEN g.i % 3 = 0 THEN v_team_s ELSE v_team_n END,
      v_agent_id,
      (ARRAY['B1','B2','B3','B4','B5','B6_PLUS']::public.bucket_type[])[1 + (g.i % 6)],
      CASE WHEN g.i % 3 = 0 THEN 'Home Loan' WHEN g.i % 2 = 0 THEN 'Personal Loan' ELSE 'Business Loan' END,
      c.state,
      c.city,
      25000 + (g.i * 1750),
      25000 + (g.i * 1750),
      LEAST(25000 + (g.i * 1750), (g.i * 620)),
      CURRENT_DATE - (g.i % 45),
      NOW() - ((g.i % 20) || ' days')::interval,
      'Follow-up remark for account ' || (v_existing + g.i),
      CASE
        WHEN g.i % 10 = 0 THEN 'fully_collected'::public.account_status
        WHEN g.i % 7 = 0 THEN 'partially_collected'::public.account_status
        ELSE 'in_progress'::public.account_status
      END
    FROM generate_series(1, v_needed) AS g(i)
    CROSS JOIN LATERAL (
      SELECT id, state, city
      FROM public.customers
      ORDER BY md5(id::text || g.i::text)
      LIMIT 1
    ) c
    ON CONFLICT (loan_number) DO NOTHING;
  END IF;

  INSERT INTO public.collection_payments (account_id, agent_id, payment_date, payment_amount, payment_mode)
  SELECT
    a.id,
    v_agent_id,
    CURRENT_DATE - (g.i % 90),
    500 + (g.i * 75),
    CASE WHEN g.i % 3 = 0 THEN 'UPI' WHEN g.i % 3 = 1 THEN 'Cash' ELSE 'NEFT' END
  FROM generate_series(1, 1200) AS g(i)
  CROSS JOIN LATERAL (
    SELECT id FROM public.accounts ORDER BY md5(id::text || g.i::text) LIMIT 1
  ) a
  WHERE NOT EXISTS (
    SELECT 1 FROM public.collection_payments cp
    WHERE cp.account_id = a.id AND cp.payment_date = CURRENT_DATE - (g.i % 90)
      AND cp.payment_amount = 500 + (g.i * 75)
  );

  FOR g IN 1..350 LOOP
    v_status := (ARRAY['pending','kept','broken']::public.ptp_status[])[1 + (g % 3)];
    INSERT INTO public.ptp_records (
      account_id, agent_id, ptp_amount, ptp_date, status, kept_at, broken_at, remark
    )
    SELECT
      a.id,
      v_agent_id,
      3000 + (g * 250),
      CURRENT_DATE + (g % 21),
      v_status,
      CASE WHEN v_status = 'kept'   THEN NOW() - INTERVAL '3 days' ELSE NULL END,
      CASE WHEN v_status = 'broken' THEN NOW() - INTERVAL '2 days' ELSE NULL END,
      'PTP record #' || g
    FROM (
      SELECT id FROM public.accounts ORDER BY md5(id::text || g::text) LIMIT 1
    ) a
    WHERE NOT EXISTS (
      SELECT 1 FROM public.ptp_records pr
      WHERE pr.account_id = a.id AND pr.ptp_amount = 3000 + (g * 250)
    );
  END LOOP;

  INSERT INTO public.field_visits (
    account_id, agent_id, visit_date, customer_met,
    promise_to_pay, ptp_amount, settlement_interest, remarks
  )
  SELECT
    a.id,
    v_agent_id,
    CURRENT_DATE - (g.i % 60),
    g.i % 4 <> 0,
    g.i % 5 = 0,
    CASE WHEN g.i % 5 = 0 THEN 2500 + g.i * 150 ELSE NULL END,
    g.i % 6 = 0,
    'Field visit #' || g.i
  FROM generate_series(1, 180) AS g(i)
  CROSS JOIN LATERAL (
    SELECT id FROM public.accounts ORDER BY md5(id::text || (g.i + 100)::text) LIMIT 1
  ) a
  WHERE NOT EXISTS (
    SELECT 1 FROM public.field_visits fv
    WHERE fv.account_id = a.id AND fv.visit_date = CURRENT_DATE - (g.i % 60)
      AND fv.remarks = 'Field visit #' || g.i
  );

  INSERT INTO public.settlements (
    account_id, requested_by, outstanding_amount, settlement_amount,
    request_date, status, remark
  )
  SELECT
    a.id,
    v_agent_id,
    a.outstanding_amount,
    ROUND(a.outstanding_amount * 0.65, 2),
    CURRENT_DATE - (g.i % 30),
    (ARRAY['pending','approved','rejected']::public.settlement_status[])[1 + (g.i % 3)],
    'Settlement request #' || g.i
  FROM generate_series(1, 60) AS g(i)
  CROSS JOIN LATERAL (
    SELECT id, outstanding_amount
    FROM public.accounts
    ORDER BY md5(id::text || (g.i + 200)::text)
    LIMIT 1
  ) a
  WHERE NOT EXISTS (
    SELECT 1 FROM public.settlements s
    WHERE s.account_id = a.id AND s.remark = 'Settlement request #' || g.i
  );

END $$;

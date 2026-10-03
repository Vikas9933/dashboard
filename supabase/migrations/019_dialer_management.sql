-- =============================================================================
-- Dialer Management & Performance
-- Calling activity linked to allocated cases, PTP, and resolution
-- =============================================================================

ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS client_name TEXT NOT NULL DEFAULT 'Unassigned Client',
  ADD COLUMN IF NOT EXISTS bank_name TEXT NOT NULL DEFAULT 'Unassigned Bank';

CREATE INDEX IF NOT EXISTS idx_accounts_client_name ON public.accounts(client_name);
CREATE INDEX IF NOT EXISTS idx_accounts_bank_name ON public.accounts(bank_name);

UPDATE public.accounts
SET
  client_name = (ARRAY['HDFC Ltd', 'ICICI Ltd', 'SBI Cards', 'Axis Finance', 'Kotak Prime'])[
    1 + (ABS(HASHTEXT(loan_number)) % 5)
  ],
  bank_name = (ARRAY['HDFC Bank', 'ICICI Bank', 'SBI', 'Axis Bank', 'Kotak Mahindra'])[
    1 + (ABS(HASHTEXT(id::text)) % 5)
  ]
WHERE client_name = 'Unassigned Client'
   OR bank_name = 'Unassigned Bank';

DO $$ BEGIN
  CREATE TYPE public.call_outcome AS ENUM (
    'not_connected',
    'connected',
    'rpc',
    'wrong_party',
    'busy',
    'no_answer',
    'voicemail',
    'follow_up',
    'ptp'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.dialer_calls (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  account_id          UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  agent_id            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  customer_id         UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  loan_number         TEXT,
  phone_number        TEXT,
  call_started_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  call_ended_at       TIMESTAMPTZ,
  duration_seconds    INTEGER NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  outcome             public.call_outcome NOT NULL DEFAULT 'not_connected',
  is_connected        BOOLEAN NOT NULL DEFAULT FALSE,
  is_rpc              BOOLEAN NOT NULL DEFAULT FALSE,
  is_follow_up        BOOLEAN NOT NULL DEFAULT FALSE,
  ptp_record_id       UUID REFERENCES public.ptp_records(id) ON DELETE SET NULL,
  external_call_id    TEXT,
  dialer_source       TEXT,
  remarks             TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT dialer_calls_rpc_requires_connected CHECK (
    is_rpc = FALSE OR is_connected = TRUE
  )
);

CREATE INDEX IF NOT EXISTS idx_dialer_calls_tenant_id ON public.dialer_calls(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dialer_calls_account_id ON public.dialer_calls(account_id);
CREATE INDEX IF NOT EXISTS idx_dialer_calls_agent_id ON public.dialer_calls(agent_id);
CREATE INDEX IF NOT EXISTS idx_dialer_calls_started_at ON public.dialer_calls(call_started_at);
CREATE INDEX IF NOT EXISTS idx_dialer_calls_outcome ON public.dialer_calls(outcome);
CREATE UNIQUE INDEX IF NOT EXISTS idx_dialer_calls_external
  ON public.dialer_calls(tenant_id, external_call_id)
  WHERE external_call_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_dialer_calls_updated_at ON public.dialer_calls;
CREATE TRIGGER trg_dialer_calls_updated_at
  BEFORE UPDATE ON public.dialer_calls
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.dialer_calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scoped_select_dialer_calls" ON public.dialer_calls;
CREATE POLICY "scoped_select_dialer_calls"
  ON public.dialer_calls FOR SELECT TO authenticated
  USING (
    public.can_access_tenant(tenant_id)
    AND (
      public.is_super_admin()
      OR public.current_user_role() = 'admin'
      OR agent_id = auth.uid()
      OR (
        account_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.accounts a
          WHERE a.id = dialer_calls.account_id
            AND public.can_read_account(a.tenant_id, a.agency_id, a.team_id, a.assigned_agent_id)
        )
      )
    )
  );

DROP POLICY IF EXISTS "scoped_insert_dialer_calls" ON public.dialer_calls;
CREATE POLICY "scoped_insert_dialer_calls"
  ON public.dialer_calls FOR INSERT TO authenticated
  WITH CHECK (
    public.can_access_tenant(tenant_id)
    AND (
      public.is_super_admin()
      OR public.current_user_role() IN ('admin', 'manager')
      OR agent_id = auth.uid()
      OR (
        public.current_user_role() = 'team_leader'
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = dialer_calls.agent_id
            AND p.team_id = public.user_team_id()
        )
      )
    )
  );

COMMENT ON TABLE public.dialer_calls IS
  'Inbound dialer / manual call events linked to allocated cases for productivity and resolution accountability.';

-- Demo calling activity so dashboards are populated
INSERT INTO public.dialer_calls (
  tenant_id, account_id, agent_id, customer_id, loan_number, phone_number,
  call_started_at, call_ended_at, duration_seconds, outcome,
  is_connected, is_rpc, is_follow_up, dialer_source, remarks
)
SELECT
  a.tenant_id,
  a.id,
  a.assigned_agent_id,
  a.customer_id,
  a.loan_number,
  c.mobile_number,
  (CURRENT_DATE - ((g.n + ABS(HASHTEXT(a.id::text))) % 21))::timestamptz
    + ((8 + (g.n % 10)) || ' hours')::interval
    + ((g.n * 7) || ' minutes')::interval,
  (CURRENT_DATE - ((g.n + ABS(HASHTEXT(a.id::text))) % 21))::timestamptz
    + ((8 + (g.n % 10)) || ' hours')::interval
    + ((g.n * 7 + (CASE WHEN (ABS(HASHTEXT(a.id::text || g.n::text)) % 10) < 6 THEN 45 + (g.n % 180) ELSE 8 END)) || ' seconds')::interval,
  CASE
    WHEN (ABS(HASHTEXT(a.id::text || g.n::text)) % 10) < 6 THEN 45 + (ABS(HASHTEXT(a.loan_number || g.n::text)) % 240)
    ELSE 8 + (g.n % 12)
  END,
  CASE
    WHEN (ABS(HASHTEXT(a.id::text || g.n::text)) % 10) >= 6 THEN 'not_connected'::public.call_outcome
    WHEN (ABS(HASHTEXT(a.id::text || g.n::text)) % 10) >= 4 THEN 'connected'::public.call_outcome
    WHEN (ABS(HASHTEXT(a.id::text || g.n::text)) % 10) = 3 THEN 'follow_up'::public.call_outcome
    ELSE 'rpc'::public.call_outcome
  END,
  (ABS(HASHTEXT(a.id::text || g.n::text)) % 10) < 6,
  (ABS(HASHTEXT(a.id::text || g.n::text)) % 10) < 4,
  (ABS(HASHTEXT(a.id::text || g.n::text)) % 10) IN (3, 1),
  'demo-dialer',
  'Seeded call #' || g.n
FROM public.accounts a
JOIN public.customers c ON c.id = a.customer_id
CROSS JOIN generate_series(1, 3) AS g(n)
WHERE NOT EXISTS (SELECT 1 FROM public.dialer_calls d WHERE d.account_id = a.id)
LIMIT 2400;

UPDATE public.subscription_plans
SET features = features || '{"dialer_management": true}'::jsonb,
    updated_at = NOW()
WHERE code IN ('pro', 'enterprise');

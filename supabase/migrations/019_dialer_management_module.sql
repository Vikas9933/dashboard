-- =============================================================================
-- Dialer Management & Performance Module Schema
-- Tracks agent-level outbound calling telemetry, connection rates, RPC, PTP,
-- and connects calling activity directly to case resolution accountability.
-- =============================================================================

CREATE TYPE public.dialer_disposition_type AS ENUM (
  'RPC_PTP',
  'RPC_CALL_BACK',
  'RPC_DISPUTE',
  'RPC_REFUSAL',
  'RPC_SETTLEMENT_REQUEST',
  'THIRD_PARTY_CONTACT',
  'WRONG_NUMBER',
  'BUSY',
  'SWITCHED_OFF',
  'RINGING_NO_ANSWER',
  'NOT_REACHABLE',
  'CALL_DROPPED'
);

CREATE TABLE IF NOT EXISTS public.dialer_call_logs (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_session_id         TEXT NOT NULL UNIQUE,
  account_id              UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  customer_id             UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  tenant_id               UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  agency_id               UUID REFERENCES public.agencies(id) ON DELETE SET NULL,
  team_id                 UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  agent_id                UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  phone_number            TEXT NOT NULL,
  call_date               DATE NOT NULL DEFAULT CURRENT_DATE,
  call_time               TIME NOT NULL DEFAULT CURRENT_TIME,
  duration_seconds        INTEGER NOT NULL DEFAULT 0,
  talk_time_seconds       INTEGER NOT NULL DEFAULT 0,
  wait_time_seconds       INTEGER NOT NULL DEFAULT 0,
  is_connected            BOOLEAN NOT NULL DEFAULT FALSE,
  disposition             public.dialer_disposition_type NOT NULL,
  is_rpc                  BOOLEAN NOT NULL DEFAULT FALSE,
  ptp_generated           BOOLEAN NOT NULL DEFAULT FALSE,
  ptp_amount              NUMERIC(15, 2) DEFAULT 0,
  ptp_date                DATE,
  ptp_status              public.ptp_status,
  is_follow_up            BOOLEAN NOT NULL DEFAULT FALSE,
  follow_up_date          DATE,
  is_resolved             BOOLEAN NOT NULL DEFAULT FALSE,
  resolution_amount       NUMERIC(15, 2) DEFAULT 0,
  resolution_status       TEXT DEFAULT 'in_progress',
  notes                   TEXT,
  recording_url           TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dialer_account_id ON public.dialer_call_logs(account_id);
CREATE INDEX IF NOT EXISTS idx_dialer_agent_id ON public.dialer_call_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_dialer_call_date ON public.dialer_call_logs(call_date);
CREATE INDEX IF NOT EXISTS idx_dialer_disposition ON public.dialer_call_logs(disposition);
CREATE INDEX IF NOT EXISTS idx_dialer_is_rpc ON public.dialer_call_logs(is_rpc);
CREATE INDEX IF NOT EXISTS idx_dialer_is_resolved ON public.dialer_call_logs(is_resolved);
CREATE INDEX IF NOT EXISTS idx_dialer_tenant_id ON public.dialer_call_logs(tenant_id);

-- Enable RLS
ALTER TABLE public.dialer_call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read dialer_call_logs"
  ON public.dialer_call_logs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert dialer_call_logs"
  ON public.dialer_call_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

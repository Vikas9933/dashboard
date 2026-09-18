-- Track when admins were emailed about a pending signup (prevents duplicate alerts on re-login)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS signup_notified_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.signup_notified_at IS
  'Timestamp when approval notification emails were sent for this pending signup';

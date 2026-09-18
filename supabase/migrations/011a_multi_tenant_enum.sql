-- =============================================================================
-- STEP 1 of 2 — Multi-tenant enum
-- Run this FIRST in Supabase SQL Editor, then run 011_multi_tenant.sql
-- (PostgreSQL requires new enum values to commit before use.)
-- =============================================================================

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'super_admin';

-- ============================================================
-- WAGORA — Schema Additions Migration
-- Run this in the Supabase SQL Editor AFTER the main schema.sql
-- These tables/columns are used by the backend but were missing
-- from the original schema, causing silent fallback to local JSON.
-- ============================================================

-- ============================================================
-- ADD MISSING COLUMNS TO EXISTING TABLES
-- ============================================================

-- Add active_agent_id to profiles (used by AI agent system)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active_agent_id uuid;

-- Add campaign_id to brand_documents (used to scope docs per campaign)
ALTER TABLE public.brand_documents
  ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.campaigns ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS brand_documents_campaign_id_idx ON public.brand_documents(campaign_id);

-- ============================================================
-- ADD INSERT POLICY ON PROFILES
-- (Previously only SELECT + UPDATE existed — if the trigger
--  fails on signup, users were locked out with no way to create profile)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles'
    AND policyname = 'Users can create own profile'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can create own profile"
      ON public.profiles FOR INSERT
      WITH CHECK (auth.uid() = id)';
  END IF;
END $$;

-- ============================================================
-- DAILY USAGE (tracks per-user outreach count per day)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.daily_usage (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  email_count int NOT NULL DEFAULT 0,
  UNIQUE (user_id, date)
);

ALTER TABLE public.daily_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their daily usage"
  ON public.daily_usage FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS daily_usage_user_date_idx ON public.daily_usage(user_id, date);

-- ============================================================
-- SALES AGENTS (AI agent configurations per user)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sales_agents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name text NOT NULL DEFAULT 'Wagora Agent',
  persona text,
  tone text NOT NULL DEFAULT 'Professional and direct',
  is_active boolean NOT NULL DEFAULT false,
  target_industries text[],
  target_roles text[],
  geography text[],
  offer_description text,
  icp_threshold int NOT NULL DEFAULT 7 CHECK (icp_threshold >= 0 AND icp_threshold <= 10),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sales_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their sales agents"
  ON public.sales_agents FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS sales_agents_user_id_idx ON public.sales_agents(user_id);
CREATE INDEX IF NOT EXISTS sales_agents_is_active_idx ON public.sales_agents(is_active);

-- Realtime for agent status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales_agents;

-- ============================================================
-- FOLLOWUP QUEUE (scheduled follow-up outreach)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.followup_queue (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  prospect_id uuid REFERENCES public.prospects ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.campaigns ON DELETE CASCADE,
  prospect_email text,
  prospect_name text,
  scheduled_at timestamptz NOT NULL,
  message_content text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  attempt_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.followup_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their followup queue"
  ON public.followup_queue FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS followup_queue_user_id_idx ON public.followup_queue(user_id);
CREATE INDEX IF NOT EXISTS followup_queue_scheduled_at_idx ON public.followup_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS followup_queue_status_idx ON public.followup_queue(status);

-- ============================================================
-- UPDATE SUPABASE TYPES NOTE
-- After running this, update types.ts to add:
--   - daily_usage table type
--   - sales_agents table type
--   - followup_queue table type
--   - active_agent_id field on profiles
--   - campaign_id field on brand_documents
-- ============================================================

-- ============================================================
-- WAGORA — Full Database Schema Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name text,
  business_name text,
  industry text,
  country text,
  avatar_url text,
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro','growth','agency')),
  trial_ends_at timestamptz NOT NULL DEFAULT now() + interval '14 days',
  email_verified_at timestamptz,
  onboarding_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- WORKSPACE SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.workspace_settings (
  user_id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  daily_outreach_limit int NOT NULL DEFAULT 50,
  what_you_sell text,
  target_client_description text,
  average_deal_value numeric,
  connected_platforms jsonb NOT NULL DEFAULT '{}',
  notification_prefs jsonb NOT NULL DEFAULT '{}'
);

ALTER TABLE public.workspace_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own workspace settings"
  ON public.workspace_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- CAMPAIGNS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('Email','LinkedIn','Instagram')),
  description text,
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Live','Paused','Draft','Complete','Needs attention')),
  prospects int NOT NULL DEFAULT 0,
  replies int NOT NULL DEFAULT 0,
  closed int NOT NULL DEFAULT 0,
  last_active text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their campaigns"
  ON public.campaigns FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS campaigns_user_id_idx ON public.campaigns(user_id);
CREATE INDEX IF NOT EXISTS campaigns_status_idx ON public.campaigns(status);

-- ============================================================
-- PROSPECTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.prospects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  campaign_id uuid REFERENCES public.campaigns ON DELETE SET NULL,
  name text NOT NULL,
  company text,
  role text,
  email text,
  score int NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  platform text NOT NULL CHECK (platform IN ('Email','LinkedIn','Instagram')),
  status text NOT NULL DEFAULT 'New' CHECK (status IN ('New','Outreach sent','Replied','In closing sequence','Call booked','Closed','Not a fit')),
  last_contact text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their prospects"
  ON public.prospects FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS prospects_user_id_idx ON public.prospects(user_id);
CREATE INDEX IF NOT EXISTS prospects_campaign_id_idx ON public.prospects(campaign_id);

-- ============================================================
-- CONVERSATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  prospect_id uuid REFERENCES public.prospects ON DELETE SET NULL,
  prospect_name text NOT NULL,
  prospect_company text,
  platform text NOT NULL CHECK (platform IN ('Email','LinkedIn','Instagram')),
  status text NOT NULL DEFAULT 'Awaiting reply' CHECK (status IN ('Wagora responding','Awaiting reply','In closing sequence','Call booked','Closed','Flagged — input needed')),
  last_message text,
  last_message_time text,
  unread boolean NOT NULL DEFAULT false,
  campaign_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their conversations"
  ON public.conversations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS conversations_user_id_idx ON public.conversations(user_id);

-- ============================================================
-- MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid REFERENCES public.conversations ON DELETE CASCADE NOT NULL,
  sender text NOT NULL CHECK (sender IN ('wagora','prospect','user')),
  content text NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access messages via conversations"
  ON public.messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id AND c.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS messages_conversation_id_idx ON public.messages(conversation_id);

-- ============================================================
-- DEALS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.deals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  client text NOT NULL,
  company text,
  service text,
  value numeric NOT NULL DEFAULT 0,
  closed_date text,
  campaign text,
  status text NOT NULL DEFAULT 'Awaiting payment' CHECK (status IN ('Payment confirmed','Awaiting payment','In delivery','Complete')),
  closed_via text CHECK (closed_via IN ('Chat','Call')),
  conversation_summary text,
  commitments text[] NOT NULL DEFAULT '{}',
  suggested_next_step text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their deals"
  ON public.deals FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS deals_user_id_idx ON public.deals(user_id);

-- ============================================================
-- INVOICES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id uuid REFERENCES public.deals ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  invoice_number text UNIQUE NOT NULL,
  template_id uuid,
  client_name text NOT NULL,
  client_email text,
  client_company text,
  line_items jsonb NOT NULL DEFAULT '[]',
  subtotal numeric NOT NULL DEFAULT 0,
  tax numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'NGN',
  payment_details_type text CHECK (payment_details_type IN ('local','international')),
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','Sent','Viewed','Paid','Overdue')),
  issued_at timestamptz,
  due_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their invoices"
  ON public.invoices FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS invoices_user_id_idx ON public.invoices(user_id);

-- ============================================================
-- INVOICE TEMPLATES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.invoice_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  default_currency text NOT NULL DEFAULT 'NGN',
  payment_details_local jsonb,
  payment_details_international jsonb,
  logo_url text,
  footer_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invoice_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their invoice templates"
  ON public.invoice_templates FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- ACTIVITIES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.activities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('prospect_found','reply_received','deal_closed','campaign_status','outreach_sent','call_booked','flagged')),
  message text NOT NULL,
  meta text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their activities"
  ON public.activities FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS activities_user_id_idx ON public.activities(user_id);
CREATE INDEX IF NOT EXISTS activities_created_at_idx ON public.activities(created_at DESC);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('deal_closed','call_booked','new_reply','input_needed','campaign_complete','limit_reached','platform_disconnected','payment_confirmed')),
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  link text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their notifications"
  ON public.notifications FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON public.notifications(read);

-- ============================================================
-- BRAND DOCUMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.brand_documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  file_type text NOT NULL,
  size text NOT NULL,
  storage_path text NOT NULL,
  status text NOT NULL DEFAULT 'Processing' CHECK (status IN ('Processing','Active','Error — reupload')),
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.brand_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their brand documents"
  ON public.brand_documents FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- TRIGGER: Auto-create profile + workspace_settings on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, plan)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    'free'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.workspace_settings (user_id)
  VALUES (new.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- STORAGE: Brand documents bucket
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'brand-documents',
  'brand-documents',
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain','image/jpeg','image/png']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload brand documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'brand-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own brand documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'brand-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own brand documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'brand-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- REALTIME: Enable for live updates
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activities;

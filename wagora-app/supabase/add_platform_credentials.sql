-- ============================================================
-- WAGORA — Platform Credentials Migration
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Add is_founder column to profiles
--    Allows founder account to fall back to env Gmail credentials.
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_founder boolean NOT NULL DEFAULT false;

-- 2. Add 'starter' to the plan CHECK constraint
--    (profiles.plan was missing 'starter' from the valid values)
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_plan_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_plan_check
CHECK (plan IN ('free', 'starter', 'pro', 'growth', 'agency'));

-- 3. Mark the founder account
--    Replace <YOUR_FOUNDER_USER_UUID> with the UUID from auth.users
--    for the admin/founder account. Find it in:
--    Supabase → Authentication → Users → copy the UUID.
-- UPDATE public.profiles
-- SET is_founder = true
-- WHERE id = '<YOUR_FOUNDER_USER_UUID>';

-- 4. Verify
SELECT id, full_name, plan, is_founder
FROM public.profiles
ORDER BY created_at ASC
LIMIT 10;

-- 5. Verify workspace_settings can hold connected_platforms
--    (should already be jsonb DEFAULT '{}' from schema.sql)
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'workspace_settings'
  AND column_name = 'connected_platforms';

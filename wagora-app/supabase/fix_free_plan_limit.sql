-- ============================================================
-- WAGORA — Free Plan Email Limit Correction
-- Run in: Supabase Dashboard → SQL Editor
-- Purpose: Set free plan daily email limit to 20 (was 0)
-- ============================================================

-- Step 1: Apply the change
UPDATE public.plan_limits
SET email_per_day = 20
WHERE plan = 'free';

-- Step 2: Verify the free plan row
SELECT plan, email_per_day, linkedin_per_day, instagram_per_day
FROM public.plan_limits
WHERE plan = 'free';
-- Expected: email_per_day = 20

-- Step 3: Verify all plans are unchanged except free
SELECT plan, email_per_day, linkedin_per_day, instagram_per_day
FROM public.plan_limits
ORDER BY email_per_day ASC;
-- Expected order:
--   free    | 20
--   starter | 100
--   pro     | 100
--   growth  | 300
--   agency  | 1000

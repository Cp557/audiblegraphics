-- One-Time Backfill: Create main_table rows for existing users
-- Run this once in your Supabase SQL Editor after adding the unique constraint

-- Check how many users are missing main_table rows
SELECT COUNT(*) as missing_users
FROM auth.users u
LEFT JOIN public.main_table m ON u.id = m.user_id
WHERE u.email_confirmed_at IS NOT NULL
AND m.user_id IS NULL;

-- Create main_table rows for all existing authenticated users
INSERT INTO public.main_table (user_id, created_at)
SELECT id, created_at
FROM auth.users
WHERE email_confirmed_at IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- Verify all users now have main_table rows
SELECT
  (SELECT COUNT(*) FROM auth.users WHERE email_confirmed_at IS NOT NULL) as total_users,
  (SELECT COUNT(*) FROM public.main_table) as total_main_table_rows;

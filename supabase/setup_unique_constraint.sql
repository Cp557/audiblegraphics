-- One-Time Setup: Add Unique Constraint to main_table.user_id
-- This allows safe upsert operations in the Next.js auth callback
-- Run this once in your Supabase SQL Editor

-- Add unique constraint if it doesn't already exist
ALTER TABLE public.main_table
ADD CONSTRAINT IF NOT EXISTS main_table_user_id_key UNIQUE (user_id);

-- Verify the constraint was added
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'public.main_table'::regclass
AND conname = 'main_table_user_id_key';

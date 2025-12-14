-- Add account_status and role_requested to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'approved' NOT NULL, -- pending, approved, rejected
ADD COLUMN IF NOT EXISTS role_requested TEXT;
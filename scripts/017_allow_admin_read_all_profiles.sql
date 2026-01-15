-- Drop existing policy
DROP POLICY IF EXISTS "Allow users read own profile" ON public.profiles;

-- Create new policy to allow users to read their own profile, and admins/super_admins to read all profiles
CREATE POLICY "Allow users read own profile" ON public.profiles FOR SELECT USING (
  auth.uid() = id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
);

-- Ensure other policies remain for consistency and security, if they were dropped by mistake in a previous migration.
-- These policies are already defined in 001_create_tables.sql and 014_fix_rls_policy.sql, but
-- including them here ensures this migration is self-contained for profile RLS.

-- Allow users update own profile
DROP POLICY IF EXISTS "Allow users update own profile" ON public.profiles;
CREATE POLICY "Allow users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Allow users insert own profile
DROP POLICY IF EXISTS "Allow users insert own profile" ON public.profiles;
CREATE POLICY "Allow users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

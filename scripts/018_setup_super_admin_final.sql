-- Complete super admin setup for vinnywalker96@gmail.com
-- Run this script in Supabase SQL Editor after creating the user account

-- Step 1: Create or update the user profile with super_admin role
INSERT INTO public.user_profiles (
  id,
  email,
  role,
  full_name,
  created_at,
  updated_at
)
SELECT 
  id,
  email,
  'super_admin',
  'Marlvin Kwenda',
  NOW(),
  NOW()
FROM auth.users 
WHERE email = 'vinnywalker96@gmail.com'
ON CONFLICT (id) 
DO UPDATE SET 
  role = 'super_admin',
  updated_at = NOW();

-- Step 2: Grant super admin all permissions
-- Update RLS policies to allow super_admin access

-- Enable RLS on all tables if not already enabled
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- Super admin can do everything
CREATE POLICY IF NOT EXISTS "Super admins have full access to user_profiles"
ON public.user_profiles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

CREATE POLICY IF NOT EXISTS "Super admins have full access to products"
ON public.products
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

CREATE POLICY IF NOT EXISTS "Super admins have full access to orders"
ON public.orders
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

CREATE POLICY IF NOT EXISTS "Super admins have full access to vendors"
ON public.vendors
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

-- Verify the setup
SELECT 
  u.email,
  p.role,
  p.full_name,
  p.created_at
FROM auth.users u
LEFT JOIN public.user_profiles p ON u.id = p.id
WHERE u.email = 'vinnywalker96@gmail.com';

-- Ensure vinnywalker96@gmail.com has super_admin role

-- First, check if the user exists in auth.users and get their ID
DO $$
DECLARE
  user_id UUID;
BEGIN
  -- Find the user ID from auth.users
  SELECT id INTO user_id 
  FROM auth.users 
  WHERE email = 'vinnywalker96@gmail.com';

  -- If user exists
  IF user_id IS NOT NULL THEN
    -- Ensure profile exists
    INSERT INTO public.profiles (id, email, role, created_at, updated_at)
    VALUES (user_id, 'vinnywalker96@gmail.com', 'super_admin', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE
    SET role = 'super_admin', updated_at = NOW();

    RAISE NOTICE 'Super admin profile created/updated for vinnywalker96@gmail.com';
  ELSE
    RAISE NOTICE 'User vinnywalker96@gmail.com does not exist in auth.users yet. Create account first.';
  END IF;
END $$;

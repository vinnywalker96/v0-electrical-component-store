-- Ensure the user exists before updating the role.
-- This script will not fail if the user does not exist.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE email = 'vinnywalker96@gmail.com') THEN
    UPDATE public.profiles
    SET role = 'super_admin'
    WHERE email = 'vinnywalker96@gmail.com';
  END IF;
END $$;

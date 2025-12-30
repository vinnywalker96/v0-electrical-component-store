-- Add super admin user vinnywalker96@gmail.com
-- This should be run after the user signs up first time
-- Replace the user_id placeholder with actual UUID after signup

-- First, create a helper function to add super admin
CREATE OR REPLACE FUNCTION add_super_admin(admin_email VARCHAR(255))
RETURNS TABLE(success BOOLEAN, message VARCHAR(255)) AS $$
DECLARE
  admin_user_id UUID;
BEGIN
  SELECT id INTO admin_user_id FROM auth.users WHERE email = admin_email LIMIT 1;
  
  IF admin_user_id IS NULL THEN
    RETURN QUERY SELECT false::boolean, 'User not found'::varchar;
  ELSE
    UPDATE profiles SET role = 'super_admin' WHERE id = admin_user_id;

    -- Ensure a seller entry exists for the new super_admin
    INSERT INTO sellers (user_id, store_name, store_description, verification_status)
    VALUES (admin_user_id, admin_email || '''s Super Admin Store', 'Default store for super admin user', 'approved')
    ON CONFLICT (user_id) DO UPDATE SET verification_status = 'approved';

    RETURN QUERY SELECT true::boolean, 'Super admin role assigned and seller profile ensured'::varchar;
  END IF;
END;
$$ LANGUAGE plpgsql;

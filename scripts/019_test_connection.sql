-- Test database connection and check profiles table
SELECT 
  'Database connection successful!' as status,
  COUNT(*) as total_profiles
FROM profiles;

-- Check if super admin exists
SELECT 
  id,
  email,
  role,
  full_name,
  created_at
FROM profiles 
WHERE email = 'vinnywalker96@gmail.com';

-- If super admin doesn't exist, this will help create it manually
-- Run this ONLY if the TypeScript script fails
-- INSERT INTO profiles (id, email, role, full_name, created_at, updated_at)
-- VALUES (
--   'USER_ID_FROM_AUTH_USERS', 
--   'vinnywalker96@gmail.com', 
--   'super_admin', 
--   'Super Admin',
--   NOW(),
--   NOW()
-- );

# Super Admin Setup Instructions

## Prerequisites
The super admin email is: **vinnywalker96@gmail.com**

## Option 1: Automatic Setup (Recommended)

Run the TypeScript setup script:

```bash
pnpm tsx scripts/create-super-admin.ts
```

This will:
1. Create the user account if it doesn't exist
2. Set the role to `super_admin`
3. Create the user profile
4. Verify the setup

## Option 2: Manual Setup via Supabase Dashboard

### Step 1: Create User Account
1. Go to your Supabase project: https://app.supabase.com
2. Navigate to Authentication > Users
3. Click "Add User"
4. Email: `vinnywalker96@gmail.com`
5. Password: Choose a secure password
6. Check "Auto Confirm User"
7. Click "Create User"

### Step 2: Run SQL Script
1. Go to SQL Editor in Supabase
2. Copy and paste the contents of `scripts/018_setup_super_admin_final.sql`
3. Click "Run"
4. Verify the output shows the user with `super_admin` role

### Step 3: Verify Setup
Run this query in SQL Editor:

```sql
SELECT 
  u.email,
  p.role,
  p.full_name
FROM auth.users u
LEFT JOIN public.user_profiles p ON u.id = p.id
WHERE u.email = 'vinnywalker96@gmail.com';
```

You should see:
- email: vinnywalker96@gmail.com
- role: super_admin
- full_name: Marlvin Kwenda

## Login

After setup, log in at:
- **Admin Portal**: `https://your-domain.com/auth/admin/login`

Use the credentials:
- Email: vinnywalker96@gmail.com
- Password: (the one you set)

## Troubleshooting

### Issue: "User does not have admin role"
**Solution**: Run the SQL script again to ensure the role is set to `super_admin`

### Issue: "Invalid credentials"
**Solution**: 
1. Go to Supabase Dashboard > Authentication > Users
2. Find vinnywalker96@gmail.com
3. Click the three dots > Reset Password
4. Set a new password

### Issue: "Cannot access admin dashboard"
**Solution**: Check the browser console for errors and verify:
1. User is logged in (check localStorage for Supabase session)
2. Profile role is `super_admin` (check in Supabase Table Editor)
3. No middleware errors (check Network tab)

## Environment Variables

Ensure these are set in your `.env.local` or Vercel environment:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://udgslmkmcpewscgestap.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

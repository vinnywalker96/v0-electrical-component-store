-- Add payment_status column to orders (default: unpaid)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'unpaid';

-- Add banking details table for admin configuration
CREATE TABLE IF NOT EXISTS banking_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_holder VARCHAR(255) NOT NULL,
  bank_name VARCHAR(255) NOT NULL,
  account_number VARCHAR(50) NOT NULL,
  branch_code VARCHAR(10),
  swift_code VARCHAR(15),
  reference_note TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS for banking_details (only admins can access)
ALTER TABLE banking_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admin to read banking details" ON banking_details
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Allow super_admin to update banking details" ON banking_details
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'super_admin'
    )
  );

-- Create admin_users table to track admin permissions
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- Enable RLS for admin_users
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow super_admin to manage admin_users" ON admin_users
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'super_admin'
    )
  );
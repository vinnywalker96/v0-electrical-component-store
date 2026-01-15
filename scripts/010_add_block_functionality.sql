-- Add block functionality for users and vendors
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;

-- Add blocked_at timestamp for tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP WITH TIME ZONE;

-- Add block_reason for admin notes
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS block_reason TEXT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS block_reason TEXT;

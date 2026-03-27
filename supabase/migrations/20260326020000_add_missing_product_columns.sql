-- Add missing columns that the frontend product creation forms are expecting
-- Using IF NOT EXISTS so it safely skips any columns you might have already added manually 

ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS manufacturer TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT;

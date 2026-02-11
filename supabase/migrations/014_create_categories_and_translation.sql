-- Create categories table for hierarchical structure
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_pt TEXT,
  parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  slug TEXT,
  level INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(slug)
);

-- Add index on parent_id for faster traversal
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);

-- Enable RLS on categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Allow public read on categories
CREATE POLICY "Public can view categories" ON categories FOR SELECT USING (true);
-- Allow admin/service_role to manage categories (adjust policy as needed for scraper)
CREATE POLICY "Admins can manage categories" ON categories 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Update products table to support translations and category linkage
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS name_pt TEXT,
  ADD COLUMN IF NOT EXISTS description_pt TEXT,
  ADD COLUMN IF NOT EXISTS category_path TEXT[]; -- Cached breadcrumb path ["Components", "Connectors"]

-- Add index for category lookups
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);

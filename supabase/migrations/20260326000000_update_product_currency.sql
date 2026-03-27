-- Add currency column to products table
ALTER TABLE products ADD COLUMN currency TEXT DEFAULT 'ZAR';

-- Change specifications column from JSONB to TEXT
ALTER TABLE products ALTER COLUMN specifications TYPE TEXT USING specifications::text;

-- Adding a comment for clarity
COMMENT ON COLUMN products.currency IS 'The base currency of the product price (e.g., ZAR, USD, EUR). Defaults to ZAR.';

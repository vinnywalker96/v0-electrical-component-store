-- Add technical_documents column to products table
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS technical_documents JSONB DEFAULT '[]'::jsonb;

-- Optional: Add a policy for technical_documents if needed
-- For example, to allow public read access to this new column as well
-- Note: Existing product SELECT policies usually cover new columns for read access.

-- Migration script to rename brand to manufacturer and add Portuguese translation columns

-- rename brand to manufacturer
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'brand') THEN
    ALTER TABLE public.products RENAME COLUMN brand TO manufacturer;
  END IF;
END $$;

-- add name_pt and description_pt columns
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS name_pt TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description_pt TEXT;

-- Update existing products with names as default for Portuguese
UPDATE public.products SET name_pt = name WHERE name_pt IS NULL;
UPDATE public.products SET description_pt = description WHERE description_pt IS NULL;

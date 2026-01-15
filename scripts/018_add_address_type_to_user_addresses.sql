-- Add address_type column to user_addresses table
ALTER TABLE public.user_addresses ADD COLUMN IF NOT EXISTS address_type TEXT NOT NULL DEFAULT 'shipping';

-- Update existing rows to have a default 'shipping' type if needed
UPDATE public.user_addresses SET address_type = 'shipping' WHERE address_type IS NULL;

-- Add a CHECK constraint to limit allowed values for address_type
ALTER TABLE public.user_addresses ADD CONSTRAINT address_type_check CHECK (address_type IN ('shipping', 'billing'));

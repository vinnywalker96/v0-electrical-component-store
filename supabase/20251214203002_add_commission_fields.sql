-- Add commission_rate to products table and commission_amount to order_items table
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5, 2) DEFAULT 0.15; -- 15% default commission

ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(10, 2) DEFAULT 0.00;
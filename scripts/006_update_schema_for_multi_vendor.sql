-- 006_update_schema_for_multi_vendor.sql

-- Add seller_id, status, and is_featured to products table
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE;

-- Drop the redundant admin_users table if it exists
DROP TABLE IF EXISTS public.admin_users;

-- RLS for products table
-- Remove existing policies to redefine them comprehensively
DROP POLICY IF EXISTS "Allow public read on products" ON public.products;
DROP POLICY IF EXISTS "Allow admin insert products" ON public.products;
DROP POLICY IF EXISTS "Allow admin update products" ON public.products;
DROP POLICY IF EXISTS "Allow admin delete products" ON public.products;

-- Public read: Only approved products
CREATE POLICY "Allow public read approved products" ON public.products
FOR SELECT USING (status = 'approved');

-- Vendors can create their own products
CREATE POLICY "Allow vendors insert own products" ON public.products
FOR INSERT WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'vendor' AND seller_id = auth.uid());

-- Vendors can update their own products
CREATE POLICY "Allow vendors update own products" ON public.products
FOR UPDATE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'vendor' AND seller_id = auth.uid());

-- Vendors can delete their own products
CREATE POLICY "Allow vendors delete own products" ON public.products
FOR DELETE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'vendor' AND seller_id = auth.uid());

-- Admins and Super Admins have full CUD access to all products
CREATE POLICY "Allow admin and super_admin full products access" ON public.products
FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin'));


-- RLS for profiles table
-- Remove existing policies to redefine them
DROP POLICY IF EXISTS "Allow users read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow users insert own profile" ON public.profiles;

-- Users can view their own profile
CREATE POLICY "Allow users read own profile" ON public.profiles
FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Allow users update own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile (on signup)
CREATE POLICY "Allow users insert own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = id);

-- Admins and Super Admins can read all profiles
CREATE POLICY "Allow admin and super_admin read all profiles" ON public.profiles
FOR SELECT USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin'));

-- Admins and Super Admins can update roles (except super_admin role for admin)
CREATE POLICY "Allow admin to update profiles excluding super_admin role" ON public.profiles
FOR UPDATE
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
)
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin' OR (role <> 'super_admin')
);

-- Super Admins can delete any profile
CREATE POLICY "Allow super_admin delete profiles" ON public.profiles
FOR DELETE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin');


-- RLS for orders table
-- Remove existing policies to redefine them
DROP POLICY IF EXISTS "Allow users read own orders" ON public.orders;
DROP POLICY IF EXISTS "Allow users create orders" ON public.orders;
DROP POLICY IF EXISTS "Allow users update own orders" ON public.orders;
DROP POLICY IF EXISTS "Allow admin read all orders" ON public.orders;
DROP POLICY IF EXISTS "Allow admin update orders" ON public.orders;

-- Users can read and create their own orders
CREATE POLICY "Allow users read own orders" ON public.orders
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Allow users create orders" ON public.orders
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own orders (e.g., status changes initiated by user) - consider specific fields
CREATE POLICY "Allow users update own orders" ON public.orders
FOR UPDATE USING (auth.uid() = user_id);

-- Vendors can read orders that include their products
CREATE POLICY "Allow vendors read orders with their products" ON public.orders
FOR SELECT USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'vendor' AND EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.products p ON oi.product_id = p.id
    WHERE oi.order_id = public.orders.id AND p.seller_id = auth.uid()
  )
);

-- Admins and Super Admins have full read access to all orders
CREATE POLICY "Allow admin and super_admin read all orders" ON public.orders
FOR SELECT USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin'));

-- Admins and Super Admins can update all orders (e.g., status, payment_status)
CREATE POLICY "Allow admin and super_admin update all orders" ON public.orders
FOR UPDATE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin'));

-- RLS for order_items table
-- Remove existing policies to redefine them
DROP POLICY IF EXISTS "Allow users read own order items" ON public.order_items;
DROP POLICY IF EXISTS "Allow users insert own order items" ON public.order_items;

-- Users can read their own order items (if they own the parent order)
CREATE POLICY "Allow users read own order items" ON public.order_items
FOR SELECT USING (EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND user_id = auth.uid()));

-- Users can insert their own order items (if they own the parent order)
CREATE POLICY "Allow users insert own order items" ON public.order_items
FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND user_id = auth.uid()));

-- Vendors can read order items for their products
CREATE POLICY "Allow vendors read order items for their products" ON public.order_items
FOR SELECT USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'vendor' AND EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = public.order_items.product_id AND p.seller_id = auth.uid()
  )
);

-- Admins and Super Admins can read all order items
CREATE POLICY "Allow admin and super_admin read all order_items" ON public.order_items
FOR SELECT USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin'));

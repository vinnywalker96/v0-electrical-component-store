-- Update RLS policies to include super_admin for vendor-like actions
-- Products
DROP POLICY IF EXISTS "Allow vendor_admin insert own products" ON public.products;
CREATE POLICY "Allow vendor_admin and super_admin insert own products" ON public.products
FOR INSERT WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('vendor_admin', 'super_admin') AND seller_id = auth.uid());

DROP POLICY IF EXISTS "Allow vendor_admin update own products" ON public.products;
CREATE POLICY "Allow vendor_admin and super_admin update own products" ON public.products
FOR UPDATE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('vendor_admin', 'super_admin') AND seller_id = auth.uid());

DROP POLICY IF EXISTS "Allow vendor_admin delete own products" ON public.products;
CREATE POLICY "Allow vendor_admin and super_admin delete own products" ON public.products
FOR DELETE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('vendor_admin', 'super_admin') AND seller_id = auth.uid());

-- Orders
DROP POLICY IF EXISTS "Allow vendor_admin read orders with their products" ON public.orders;
CREATE POLICY "Allow vendor_admin and super_admin read orders with their products" ON public.orders
FOR SELECT USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('vendor_admin', 'super_admin') AND EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.products p ON oi.product_id = p.id
    WHERE oi.order_id = public.orders.id AND p.seller_id = auth.uid()
  )
);

-- Order Items
DROP POLICY IF EXISTS "Allow vendor_admin read order items for their products" ON public.order_items;
CREATE POLICY "Allow vendor_admin and super_admin read order items for their products" ON public.order_items
FOR SELECT USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('vendor_admin', 'super_admin') AND EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = public.order_items.product_id AND p.seller_id = auth.uid()
  )
);
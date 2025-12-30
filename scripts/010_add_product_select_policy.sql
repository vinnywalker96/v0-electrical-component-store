-- Allow public read access to products
CREATE POLICY "Public can view products" ON products
  FOR SELECT USING (true);

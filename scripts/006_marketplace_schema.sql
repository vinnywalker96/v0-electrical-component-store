-- Multi-Vendor Marketplace Schema Migration
-- This adds sellers, addresses, chat, and order tracking functionality

-- 1. Create sellers table (stores/vendors)
CREATE TABLE IF NOT EXISTS sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_name TEXT NOT NULL,
  store_description TEXT,
  store_logo TEXT,
  store_banner TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  business_address TEXT,
  bank_name TEXT,
  account_number TEXT,
  account_holder TEXT,
  branch_code TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  rating NUMERIC(3,2) DEFAULT 0,
  total_sales INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 2. Create user addresses table
CREATE TABLE IF NOT EXISTS user_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Home',
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  street_address TEXT NOT NULL,
  apartment TEXT,
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT DEFAULT 'South Africa',
  is_default BOOLEAN DEFAULT false,
  delivery_instructions TEXT,
  latitude NUMERIC(10, 8),
  longitude NUMERIC(11, 8),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Add seller_id to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES sellers(id) ON DELETE SET NULL;

-- 4. Create conversations table for chat
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  last_message_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(buyer_id, seller_id)
);

-- 5. Create messages table for chat
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 6. Create order tracking table
CREATE TABLE IF NOT EXISTS order_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  description TEXT,
  location TEXT,
  latitude NUMERIC(10, 8),
  longitude NUMERIC(11, 8),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 7. Add delivery fields to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES sellers(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address_id UUID REFERENCES user_addresses(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_delivery TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS actual_delivery TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cash_collected BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cash_collected_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS collector_id UUID REFERENCES auth.users(id);

-- 8. Create seller reviews table
CREATE TABLE IF NOT EXISTS seller_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, order_id)
);

-- Enable RLS on new tables
ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_reviews ENABLE ROW LEVEL SECURITY;

-- Sellers policies
DROP POLICY IF EXISTS "Public can view active sellers" ON sellers;
CREATE POLICY "Public can view active sellers" ON sellers
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Users can create their own seller profile" ON sellers;
CREATE POLICY "Users can create their own seller profile" ON sellers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Sellers can update their own profile" ON sellers;
CREATE POLICY "Sellers can update their own profile" ON sellers
  FOR UPDATE USING (auth.uid() = user_id);

-- User addresses policies
DROP POLICY IF EXISTS "Users can view own addresses" ON user_addresses;
CREATE POLICY "Users can view own addresses" ON user_addresses
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own addresses" ON user_addresses;
CREATE POLICY "Users can insert own addresses" ON user_addresses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own addresses" ON user_addresses;
CREATE POLICY "Users can update own addresses" ON user_addresses
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own addresses" ON user_addresses;
CREATE POLICY "Users can delete own addresses" ON user_addresses
  FOR DELETE USING (auth.uid() = user_id);

-- Conversations policies
DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
CREATE POLICY "Users can view own conversations" ON conversations
  FOR SELECT USING (
    auth.uid() = buyer_id OR 
    auth.uid() IN (SELECT user_id FROM sellers WHERE id = seller_id)
  );

DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
CREATE POLICY "Users can create conversations" ON conversations
  FOR INSERT WITH CHECK (auth.uid() = buyer_id);

-- Messages policies
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
CREATE POLICY "Users can view messages in their conversations" ON messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM conversations 
      WHERE buyer_id = auth.uid() OR 
      seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can send messages" ON messages;
CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can mark messages as read" ON messages;
CREATE POLICY "Users can mark messages as read" ON messages
  FOR UPDATE USING (
    conversation_id IN (
      SELECT id FROM conversations 
      WHERE buyer_id = auth.uid() OR 
      seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid())
    )
  );

-- Order tracking policies
DROP POLICY IF EXISTS "Users can view tracking for own orders" ON order_tracking;
CREATE POLICY "Users can view tracking for own orders" ON order_tracking
  FOR SELECT USING (
    order_id IN (SELECT id FROM orders WHERE user_id = auth.uid()) OR
    order_id IN (SELECT id FROM orders WHERE seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid()))
  );

DROP POLICY IF EXISTS "Sellers can add tracking updates" ON order_tracking;
CREATE POLICY "Sellers can add tracking updates" ON order_tracking
  FOR INSERT WITH CHECK (
    order_id IN (SELECT id FROM orders WHERE seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid()))
  );

-- Seller reviews policies
DROP POLICY IF EXISTS "Public can view seller reviews" ON seller_reviews;
CREATE POLICY "Public can view seller reviews" ON seller_reviews
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create reviews for their orders" ON seller_reviews;
CREATE POLICY "Users can create reviews for their orders" ON seller_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Update products policy to allow sellers to manage their products
DROP POLICY IF EXISTS "Allow admin insert products" ON products;
DROP POLICY IF EXISTS "Allow admin update products" ON products;
DROP POLICY IF EXISTS "Allow admin delete products" ON products;

DROP POLICY IF EXISTS "Sellers can insert their products" ON products;
CREATE POLICY "Sellers can insert their products" ON products
  FOR INSERT WITH CHECK (
    seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Sellers can update their products" ON products;
CREATE POLICY "Sellers can update their products" ON products
  FOR UPDATE USING (
    seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Sellers can delete their products" ON products;
CREATE POLICY "Sellers can delete their products" ON products
  FOR DELETE USING (
    seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Function to update seller rating
CREATE OR REPLACE FUNCTION update_seller_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE sellers
  SET rating = (
    SELECT COALESCE(AVG(rating), 0)
    FROM seller_reviews
    WHERE seller_id = NEW.seller_id
  )
  WHERE id = NEW.seller_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update seller rating on new review
DROP TRIGGER IF EXISTS update_seller_rating_trigger ON seller_reviews;
CREATE TRIGGER update_seller_rating_trigger
AFTER INSERT OR UPDATE ON seller_reviews
FOR EACH ROW
EXECUTE FUNCTION update_seller_rating();

-- Function to increment seller total sales
CREATE OR REPLACE FUNCTION increment_seller_sales()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    UPDATE sellers
    SET total_sales = total_sales + 1
    WHERE id = NEW.seller_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update seller sales count
DROP TRIGGER IF EXISTS increment_seller_sales_trigger ON orders;
CREATE TRIGGER increment_seller_sales_trigger
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION increment_seller_sales();

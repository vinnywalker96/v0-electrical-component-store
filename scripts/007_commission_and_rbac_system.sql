-- Commission System and Enhanced RBAC Schema

-- Add commission fields to sellers table
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT 15.00;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS total_commission_earned DECIMAL(10,2) DEFAULT 0;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS pending_commission DECIMAL(10,2) DEFAULT 0;

-- Add commission fields to order_items table
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(10,2) DEFAULT 0;

-- Create commissions tracking table
CREATE TABLE IF NOT EXISTS commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES order_items(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, paid, cancelled
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Update profiles table role enum to include all roles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('customer', 'vendor', 'admin', 'super_admin'));

-- Set super admin user
UPDATE profiles SET role = 'super_admin' WHERE email = 'vinnywalker96@gmail.com';

-- Enable RLS on commissions table
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

-- Commission policies: Sellers can view their own commissions
CREATE POLICY "Sellers can view own commissions" ON commissions
  FOR SELECT USING (
    seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid())
  );

-- Super admin can view all commissions
DROP POLICY IF EXISTS "Super admin can view all commissions" ON commissions;
CREATE POLICY "Super admin can view all commissions" ON commissions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- System creates commission records
DROP POLICY IF EXISTS "System creates commission records" ON commissions;
CREATE POLICY "System creates commission records" ON commissions
  FOR INSERT WITH CHECK (true);

-- Super admin can update commission status (mark as paid)
DROP POLICY IF EXISTS "Super admin can update commissions" ON commissions;
CREATE POLICY "Super admin can update commissions" ON commissions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Function to calculate and create commission on order completion
CREATE OR REPLACE FUNCTION calculate_commission()
RETURNS TRIGGER AS $$
DECLARE
  seller_commission_rate DECIMAL(5,2);
  item_commission DECIMAL(10,2);
  item_record RECORD;
BEGIN
  -- Only process when order is marked as delivered and payment is confirmed
  IF NEW.status = 'delivered' AND NEW.payment_status = 'paid' AND 
     (OLD.status != 'delivered' OR OLD.payment_status != 'paid') THEN
    
    -- Get seller commission rate
    SELECT commission_rate INTO seller_commission_rate
    FROM sellers
    WHERE id = NEW.seller_id;
    
    -- Calculate commission for each order item
    FOR item_record IN 
      SELECT id, unit_price, quantity 
      FROM order_items 
      WHERE order_id = NEW.id
    LOOP
      item_commission := (item_record.unit_price * item_record.quantity) * (seller_commission_rate / 100);
      
      -- Update order item with commission amount
      UPDATE order_items 
      SET commission_amount = item_commission 
      WHERE id = item_record.id;
      
      -- Create commission record
      INSERT INTO commissions (seller_id, order_id, order_item_id, amount, status)
      VALUES (NEW.seller_id, NEW.id, item_record.id, item_commission, 'pending');
    END LOOP;
    
    -- Update seller's pending commission
    UPDATE sellers
    SET pending_commission = pending_commission + (
      SELECT COALESCE(SUM(commission_amount), 0)
      FROM order_items
      WHERE order_id = NEW.id
    )
    WHERE id = NEW.seller_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to calculate commission on order completion
DROP TRIGGER IF EXISTS calculate_commission_trigger ON orders;
CREATE TRIGGER calculate_commission_trigger
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION calculate_commission();

-- Function to mark commission as paid
CREATE OR REPLACE FUNCTION mark_commission_paid(commission_id UUID)
RETURNS VOID AS $$
DECLARE
  commission_record RECORD;
BEGIN
  SELECT * INTO commission_record FROM commissions WHERE id = commission_id;
  
  IF commission_record.status = 'pending' THEN
    UPDATE commissions
    SET status = 'paid', paid_at = NOW(), updated_at = NOW()
    WHERE id = commission_id;
    
    UPDATE sellers
    SET 
      pending_commission = pending_commission - commission_record.amount,
      total_commission_earned = total_commission_earned + commission_record.amount
    WHERE id = commission_record.seller_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Update RLS policies for enhanced RBAC

-- Sellers policies: vendors can manage their own seller profile
DROP POLICY IF EXISTS "Users can create their own seller profile" ON sellers;
CREATE POLICY "Vendors can create seller profile" ON sellers
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'vendor')
  );

DROP POLICY IF EXISTS "Sellers can update their own profile" ON sellers;
CREATE POLICY "Vendors can update own seller profile" ON sellers
  FOR UPDATE USING (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'vendor')
  );

-- Products: Vendors can manage their own products
DROP POLICY IF EXISTS "Sellers can insert their products" ON products;
CREATE POLICY "Vendors can insert products" ON products
  FOR INSERT WITH CHECK (
    seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid()) AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'vendor') OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Sellers can update their products" ON products;
CREATE POLICY "Vendors can update own products" ON products
  FOR UPDATE USING (
    seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid()) AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'vendor') OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

DROP POLICY IF EXISTS "Sellers can delete their products" ON products;
CREATE POLICY "Vendors can delete own products" ON products
  FOR DELETE USING (
    seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid()) AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'vendor') OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Orders: Vendors can view their own orders
DROP POLICY IF EXISTS "Vendors can view own orders" ON orders;
CREATE POLICY "Vendors can view own orders" ON orders
  FOR SELECT USING (
    seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid()) AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'vendor')
  );

-- Super admin can manage everything
CREATE POLICY "Super admin full access to sellers" ON sellers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Super admin full access to orders" ON orders
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

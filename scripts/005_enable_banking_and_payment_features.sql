-- Enable payment_status column with default 'unpaid'
UPDATE orders SET payment_status = 'unpaid' WHERE payment_status IS NULL;

-- Create an index for faster admin queries
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Update RLS policy for orders to allow admins to update payment_status
DROP POLICY IF EXISTS "Allow admin read all orders" ON orders;

CREATE POLICY "Allow admin read all orders" ON orders
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('admin', 'super_admin')
    ) OR auth.uid() = user_id
  );

-- Allow admins to update orders
DROP POLICY IF EXISTS "Allow admin update orders" ON orders;

CREATE POLICY "Allow admin update orders" ON orders
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('admin', 'super_admin')
    )
  );

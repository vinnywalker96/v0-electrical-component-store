-- Order Fulfillment and Status Tracking
-- Add fulfillment tracking to orders

-- Add fulfillment columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfillment_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS carrier VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_delivery_date DATE;

-- Create order_status_history table for tracking status changes
CREATE TABLE IF NOT EXISTS order_status_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by UUID REFERENCES profiles(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create shipment_tracking table for detailed tracking
CREATE TABLE IF NOT EXISTS shipment_tracking (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    tracking_number VARCHAR(100) NOT NULL,
    carrier VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'pre_transit', 'in_transit', 'out_for_delivery', 'delivered', 'failed'
    location VARCHAR(255),
    description TEXT,
    estimated_delivery DATE,
    actual_delivery TIMESTAMP WITH TIME ZONE,
    tracking_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create return_requests table
CREATE TABLE IF NOT EXISTS return_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    order_item_id UUID REFERENCES order_items(id),
    user_id UUID NOT NULL REFERENCES profiles(id),
    reason VARCHAR(100) NOT NULL, -- 'defective', 'wrong_item', 'not_as_described', 'changed_mind', 'other'
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'received', 'refunded', 'completed'
    refund_amount DECIMAL(10,2),
    refund_method VARCHAR(50), -- 'original_payment', 'store_credit', 'bank_transfer'
    return_tracking_number VARCHAR(100),
    return_carrier VARCHAR(50),
    admin_notes TEXT,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create return_items table for multi-item returns
CREATE TABLE IF NOT EXISTS return_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    return_request_id UUID NOT NULL REFERENCES return_requests(id) ON DELETE CASCADE,
    order_item_id UUID NOT NULL REFERENCES order_items(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    condition VARCHAR(50) DEFAULT 'new', -- 'new', 'opened', 'used', 'damaged'
    reason TEXT,
    refund_amount DECIMAL(10,2)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_fulfillment_status ON orders(fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_orders_shipped_at ON orders(shipped_at);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_shipment_tracking_order_id ON shipment_tracking(order_id);
CREATE INDEX IF NOT EXISTS idx_shipment_tracking_tracking_number ON shipment_tracking(tracking_number);
CREATE INDEX IF NOT EXISTS idx_return_requests_order_id ON return_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_user_id ON return_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_status ON return_requests(status);

-- Add RLS policies
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_items ENABLE ROW LEVEL SECURITY;

-- Policies for order_status_history
DROP POLICY IF EXISTS "Users can view their own order status history" ON order_status_history;
CREATE POLICY "Users can view their own order status history" ON order_status_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = order_status_history.order_id
            AND orders.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins can manage all order status history" ON order_status_history;
CREATE POLICY "Admins can manage all order status history" ON order_status_history
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- Policies for shipment_tracking
DROP POLICY IF EXISTS "Users can view their own shipment tracking" ON shipment_tracking;
CREATE POLICY "Users can view their own shipment tracking" ON shipment_tracking
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = shipment_tracking.order_id
            AND orders.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins can manage all shipment tracking" ON shipment_tracking;
CREATE POLICY "Admins can manage all shipment tracking" ON shipment_tracking
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- Policies for return_requests
DROP POLICY IF EXISTS "Users can view and create their own return requests" ON return_requests;
CREATE POLICY "Users can view and create their own return requests" ON return_requests
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create return requests" ON return_requests;
CREATE POLICY "Users can create return requests" ON return_requests
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all return requests" ON return_requests;
CREATE POLICY "Admins can manage all return requests" ON return_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- Policies for return_items
DROP POLICY IF EXISTS "Users can view their own return items" ON return_items;
CREATE POLICY "Users can view their own return items" ON return_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM return_requests
            WHERE return_requests.id = return_items.return_request_id
            AND return_requests.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins can manage all return items" ON return_items;
CREATE POLICY "Admins can manage all return items" ON return_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- Function to automatically create status history entries
CREATE OR REPLACE FUNCTION create_order_status_history()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS NULL OR OLD.status != NEW.status THEN
        INSERT INTO order_status_history (
            order_id,
            old_status,
            new_status,
            notes
        ) VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            CASE
                WHEN NEW.status = 'shipped' THEN 'Order shipped'
                WHEN NEW.status = 'delivered' THEN 'Order delivered'
                WHEN NEW.status = 'cancelled' THEN 'Order cancelled'
                WHEN NEW.status = 'refunded' THEN 'Order refunded'
                ELSE 'Status updated'
            END
        );
    END IF;

    -- Update fulfillment status based on order status
    IF NEW.status IN ('confirmed', 'processing') THEN
        NEW.fulfillment_status = 'processing';
    ELSIF NEW.status = 'shipped' THEN
        NEW.fulfillment_status = 'shipped';
        NEW.shipped_at = COALESCE(NEW.shipped_at, NOW());
    ELSIF NEW.status = 'delivered' THEN
        NEW.fulfillment_status = 'delivered';
        NEW.delivered_at = COALESCE(NEW.delivered_at, NOW());
    ELSIF NEW.status IN ('cancelled', 'refunded') THEN
        NEW.fulfillment_status = 'cancelled';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for order status history
DROP TRIGGER IF EXISTS trigger_order_status_history ON orders;
CREATE TRIGGER trigger_order_status_history
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION create_order_status_history();

-- Function to update return request totals
CREATE OR REPLACE FUNCTION update_return_request_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE return_requests
    SET refund_amount = (
        SELECT COALESCE(SUM(refund_amount), 0)
        FROM return_items
        WHERE return_request_id = COALESCE(NEW.return_request_id, OLD.return_request_id)
    )
    WHERE id = COALESCE(NEW.return_request_id, OLD.return_request_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for return request totals
DROP TRIGGER IF EXISTS trigger_update_return_request_total ON return_items;
CREATE TRIGGER trigger_update_return_request_total
    AFTER INSERT OR UPDATE OR DELETE ON return_items
    FOR EACH ROW
    EXECUTE FUNCTION update_return_request_total();
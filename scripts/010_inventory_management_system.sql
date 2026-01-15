-- Inventory Management System
-- Add inventory tracking to products table

-- Add inventory columns to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 10;
ALTER TABLE products ADD COLUMN IF NOT EXISTS track_inventory BOOLEAN DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS allow_backorders BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku VARCHAR(100) UNIQUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight DECIMAL(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS dimensions JSONB; -- {length, width, height, unit}

-- Create inventory_transactions table for tracking stock changes
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL, -- 'sale', 'purchase', 'adjustment', 'return', 'transfer'
    quantity INTEGER NOT NULL,
    previous_quantity INTEGER NOT NULL,
    new_quantity INTEGER NOT NULL,
    reference_id UUID, -- order_id, purchase_order_id, etc.
    reference_type VARCHAR(50), -- 'order', 'purchase_order', 'manual_adjustment'
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create inventory_alerts table for low stock notifications
CREATE TABLE IF NOT EXISTS inventory_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL, -- 'low_stock', 'out_of_stock', 'overstock'
    threshold INTEGER,
    current_quantity INTEGER,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create purchase_orders table for vendor orders
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vendor_id UUID NOT NULL REFERENCES profiles(id),
    order_number VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'ordered', 'received', 'cancelled'
    total_amount DECIMAL(10,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create purchase_order_items table
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity_ordered INTEGER NOT NULL,
    quantity_received INTEGER DEFAULT 0,
    unit_cost DECIMAL(10,2),
    total_cost DECIMAL(10,2),
    received_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_product_id ON inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created_at ON inventory_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_product_id ON inventory_alerts(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_is_read ON inventory_alerts(is_read);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_vendor_id ON purchase_orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_purchase_order_id ON purchase_order_items(purchase_order_id);

-- Add RLS policies
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Policies for inventory_transactions
DROP POLICY IF EXISTS "Admins can manage inventory transactions" ON inventory_transactions;
CREATE POLICY "Admins can manage inventory transactions" ON inventory_transactions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- Policies for inventory_alerts
DROP POLICY IF EXISTS "Admins can manage inventory alerts" ON inventory_alerts;
CREATE POLICY "Admins can manage inventory alerts" ON inventory_alerts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- Policies for purchase_orders
DROP POLICY IF EXISTS "Vendors can view their own purchase orders" ON purchase_orders;
CREATE POLICY "Vendors can view their own purchase orders" ON purchase_orders
    FOR SELECT USING (vendor_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all purchase orders" ON purchase_orders;
CREATE POLICY "Admins can manage all purchase orders" ON purchase_orders
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- Policies for purchase_order_items
DROP POLICY IF EXISTS "Vendors can view their own purchase order items" ON purchase_order_items;
CREATE POLICY "Vendors can view their own purchase order items" ON purchase_order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM purchase_orders
            WHERE purchase_orders.id = purchase_order_items.purchase_order_id
            AND purchase_orders.vendor_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins can manage all purchase order items" ON purchase_order_items;
CREATE POLICY "Admins can manage all purchase order items" ON purchase_order_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- Function to update inventory when order is placed
CREATE OR REPLACE FUNCTION update_inventory_on_order()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process if order status changes to 'confirmed' or 'paid'
    IF NEW.status IN ('confirmed', 'paid') AND (OLD.status IS NULL OR OLD.status NOT IN ('confirmed', 'paid')) THEN
        -- Update product stock for each order item
        UPDATE products
        SET stock_quantity = stock_quantity - order_items.quantity
        FROM order_items
        WHERE order_items.order_id = NEW.id
        AND products.id = order_items.product_id
        AND products.track_inventory = true;

        -- Record inventory transactions
        INSERT INTO inventory_transactions (
            product_id,
            transaction_type,
            quantity,
            previous_quantity,
            new_quantity,
            reference_id,
            reference_type,
            notes
        )
        SELECT
            order_items.product_id,
            'sale',
            -order_items.quantity,
            products.stock_quantity + order_items.quantity,
            products.stock_quantity,
            NEW.id,
            'order',
            'Order ' || NEW.id || ' confirmed'
        FROM order_items
        JOIN products ON products.id = order_items.product_id
        WHERE order_items.order_id = NEW.id
        AND products.track_inventory = true;

        -- Check for low stock alerts
        INSERT INTO inventory_alerts (product_id, alert_type, threshold, current_quantity, message)
        SELECT
            products.id,
            CASE
                WHEN products.stock_quantity <= 0 THEN 'out_of_stock'
                WHEN products.stock_quantity <= products.low_stock_threshold THEN 'low_stock'
                ELSE NULL
            END,
            products.low_stock_threshold,
            products.stock_quantity,
            CASE
                WHEN products.stock_quantity <= 0 THEN products.name || ' is out of stock'
                WHEN products.stock_quantity <= products.low_stock_threshold THEN products.name || ' is low on stock (' || products.stock_quantity || ' remaining)'
                ELSE NULL
            END
        FROM products
        WHERE products.id IN (
            SELECT product_id FROM order_items WHERE order_id = NEW.id
        )
        AND products.track_inventory = true
        AND (
            products.stock_quantity <= 0
            OR products.stock_quantity <= products.low_stock_threshold
        )
        AND NOT EXISTS (
            SELECT 1 FROM inventory_alerts
            WHERE inventory_alerts.product_id = products.id
            AND inventory_alerts.alert_type IN ('low_stock', 'out_of_stock')
            AND inventory_alerts.is_read = false
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update inventory when order is cancelled/returned
CREATE OR REPLACE FUNCTION update_inventory_on_order_cancel()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process if order status changes to 'cancelled' or 'refunded'
    IF NEW.status IN ('cancelled', 'refunded') AND OLD.status NOT IN ('cancelled', 'refunded') THEN
        -- Restore product stock for each order item
        UPDATE products
        SET stock_quantity = stock_quantity + order_items.quantity
        FROM order_items
        WHERE order_items.order_id = NEW.id
        AND products.id = order_items.product_id
        AND products.track_inventory = true;

        -- Record inventory transactions
        INSERT INTO inventory_transactions (
            product_id,
            transaction_type,
            quantity,
            previous_quantity,
            new_quantity,
            reference_id,
            reference_type,
            notes
        )
        SELECT
            order_items.product_id,
            'return',
            order_items.quantity,
            products.stock_quantity - order_items.quantity,
            products.stock_quantity,
            NEW.id,
            'order',
            'Order ' || NEW.id || ' cancelled/refunded'
        FROM order_items
        JOIN products ON products.id = order_items.product_id
        WHERE order_items.order_id = NEW.id
        AND products.track_inventory = true;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_update_inventory_on_order ON orders;
CREATE TRIGGER trigger_update_inventory_on_order
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_on_order();

DROP TRIGGER IF EXISTS trigger_update_inventory_on_order_cancel ON orders;
CREATE TRIGGER trigger_update_inventory_on_order_cancel
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_on_order_cancel();

-- Function to update purchase order totals
CREATE OR REPLACE FUNCTION update_purchase_order_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE purchase_orders
    SET total_amount = (
        SELECT COALESCE(SUM(total_cost), 0)
        FROM purchase_order_items
        WHERE purchase_order_id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id)
    )
    WHERE id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for purchase order totals
DROP TRIGGER IF EXISTS trigger_update_purchase_order_total ON purchase_order_items;
CREATE TRIGGER trigger_update_purchase_order_total
    AFTER INSERT OR UPDATE OR DELETE ON purchase_order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_purchase_order_total();

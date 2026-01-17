-- =====================================================
-- ELECTRICAL COMPONENT STORE - DATABASE SCHEMA
-- =====================================================
-- This schema supports:
-- - Multi-role users (customer, vendor, admin, super_admin)
-- - Product catalog with categories and inventory
-- - Shopping cart and order management
-- - Manual bank payments with admin approval
-- - Returns and refunds workflow
-- - Analytics and reporting views
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUM TYPES
-- =====================================================

-- User roles enum
CREATE TYPE user_role AS ENUM ('customer', 'vendor', 'admin', 'super_admin');

-- Order status enum
CREATE TYPE order_status AS ENUM (
  'pending_payment',
  'payment_submitted',
  'payment_verified',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refund_requested',
  'refunded'
);

-- Payment status enum
CREATE TYPE payment_status AS ENUM (
  'pending',
  'submitted',
  'under_review',
  'approved',
  'rejected'
);

-- Return status enum
CREATE TYPE return_status AS ENUM (
  'requested',
  'approved',
  'rejected',
  'received',
  'refunded'
);

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  role user_role DEFAULT 'customer' NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Vendor profiles (additional info for vendors)
CREATE TABLE vendor_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  business_description TEXT,
  business_address TEXT,
  business_phone TEXT,
  business_email TEXT,
  logo_url TEXT,
  is_verified BOOLEAN DEFAULT false NOT NULL,
  commission_rate DECIMAL(5,2) DEFAULT 10.00 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id)
);

-- Categories table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID NOT NULL REFERENCES vendor_profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  specifications JSONB,
  price DECIMAL(10,2) NOT NULL,
  compare_at_price DECIMAL(10,2),
  cost_price DECIMAL(10,2),
  sku TEXT,
  barcode TEXT,
  stock_quantity INTEGER DEFAULT 0 NOT NULL,
  low_stock_threshold INTEGER DEFAULT 10 NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  is_featured BOOLEAN DEFAULT false NOT NULL,
  images JSONB DEFAULT '[]'::jsonb,
  meta_title TEXT,
  meta_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(vendor_id, slug)
);

-- Product variants (for products with options like size, color)
CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  price DECIMAL(10,2) NOT NULL,
  stock_quantity INTEGER DEFAULT 0 NOT NULL,
  options JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- CUSTOMER ADDRESSES
-- =====================================================

CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label TEXT DEFAULT 'Home',
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT DEFAULT 'South Africa' NOT NULL,
  is_default BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- SHOPPING CART
-- =====================================================

CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, product_id, variant_id)
);

-- =====================================================
-- ORDERS & PAYMENTS
-- =====================================================

-- Orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  status order_status DEFAULT 'pending_payment' NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  shipping_cost DECIMAL(10,2) DEFAULT 0 NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0 NOT NULL,
  discount_amount DECIMAL(10,2) DEFAULT 0 NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  shipping_address JSONB NOT NULL,
  billing_address JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Order items table
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id UUID REFERENCES product_variants(id) ON DELETE RESTRICT,
  vendor_id UUID NOT NULL REFERENCES vendor_profiles(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  product_sku TEXT,
  variant_name TEXT,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Bank payment details (for manual bank transfers)
CREATE TABLE bank_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  bank_name TEXT NOT NULL,
  account_holder TEXT NOT NULL,
  reference_number TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL,
  proof_of_payment_url TEXT,
  status payment_status DEFAULT 'pending' NOT NULL,
  admin_notes TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(order_id)
);

-- =====================================================
-- RETURNS & REFUNDS
-- =====================================================

CREATE TABLE returns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL,
  description TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  status return_status DEFAULT 'requested' NOT NULL,
  refund_amount DECIMAL(10,2),
  admin_notes TEXT,
  processed_by UUID REFERENCES profiles(id),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- REVIEWS & RATINGS
-- =====================================================

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES order_items(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  content TEXT,
  is_verified_purchase BOOLEAN DEFAULT false NOT NULL,
  is_approved BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(product_id, user_id)
);

-- =====================================================
-- WISHLISTS
-- =====================================================

CREATE TABLE wishlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, product_id)
);

-- =====================================================
-- NOTIFICATIONS
-- =====================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' NOT NULL,
  is_read BOOLEAN DEFAULT false NOT NULL,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- AUDIT LOG
-- =====================================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- STORE SETTINGS
-- =====================================================

CREATE TABLE store_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_products_vendor ON products(vendor_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_featured ON products(is_featured);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_vendor ON order_items(vendor_id);
CREATE INDEX idx_cart_items_user ON cart_items(user_id);
CREATE INDEX idx_bank_payments_status ON bank_payments(status);
CREATE INDEX idx_returns_status ON returns(status);
CREATE INDEX idx_reviews_product ON reviews(product_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_parent ON categories(parent_id);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
BEGIN
  new_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'customer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update timestamps triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendor_profiles_updated_at BEFORE UPDATE ON vendor_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bank_payments_updated_at BEFORE UPDATE ON bank_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_returns_updated_at BEFORE UPDATE ON returns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON cart_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_addresses_updated_at BEFORE UPDATE ON addresses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================
-- Secure data access based on user roles
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTIONS FOR RLS
-- =====================================================

-- Get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if user is admin or super_admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if user is a vendor
CREATE OR REPLACE FUNCTION is_vendor()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'vendor'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get vendor profile ID for current user
CREATE OR REPLACE FUNCTION get_vendor_id()
RETURNS UUID AS $$
  SELECT id FROM vendor_profiles WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =====================================================
-- PROFILES POLICIES
-- =====================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (is_admin());

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM profiles WHERE id = auth.uid()));

-- Admins can update any profile
CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (is_admin());

-- Super admins can change roles
CREATE POLICY "Super admins can manage profiles"
  ON profiles FOR ALL
  USING (get_user_role() = 'super_admin');

-- =====================================================
-- VENDOR PROFILES POLICIES
-- =====================================================

-- Anyone can view verified vendor profiles
CREATE POLICY "Anyone can view verified vendors"
  ON vendor_profiles FOR SELECT
  USING (is_verified = true);

-- Vendors can view their own profile
CREATE POLICY "Vendors can view own profile"
  ON vendor_profiles FOR SELECT
  USING (user_id = auth.uid());

-- Vendors can update their own profile
CREATE POLICY "Vendors can update own profile"
  ON vendor_profiles FOR UPDATE
  USING (user_id = auth.uid());

-- Admins can manage vendor profiles
CREATE POLICY "Admins can manage vendor profiles"
  ON vendor_profiles FOR ALL
  USING (is_admin());

-- =====================================================
-- CATEGORIES POLICIES
-- =====================================================

-- Anyone can view active categories
CREATE POLICY "Anyone can view active categories"
  ON categories FOR SELECT
  USING (is_active = true);

-- Admins can view all categories
CREATE POLICY "Admins can view all categories"
  ON categories FOR SELECT
  USING (is_admin());

-- Admins can manage categories
CREATE POLICY "Admins can manage categories"
  ON categories FOR ALL
  USING (is_admin());

-- =====================================================
-- PRODUCTS POLICIES
-- =====================================================

-- Anyone can view active products
CREATE POLICY "Anyone can view active products"
  ON products FOR SELECT
  USING (is_active = true);

-- Vendors can view their own products
CREATE POLICY "Vendors can view own products"
  ON products FOR SELECT
  USING (vendor_id = get_vendor_id());

-- Vendors can insert their own products
CREATE POLICY "Vendors can insert own products"
  ON products FOR INSERT
  WITH CHECK (vendor_id = get_vendor_id());

-- Vendors can update their own products
CREATE POLICY "Vendors can update own products"
  ON products FOR UPDATE
  USING (vendor_id = get_vendor_id());

-- Vendors can delete their own products
CREATE POLICY "Vendors can delete own products"
  ON products FOR DELETE
  USING (vendor_id = get_vendor_id());

-- Admins can manage all products
CREATE POLICY "Admins can manage all products"
  ON products FOR ALL
  USING (is_admin());

-- =====================================================
-- PRODUCT VARIANTS POLICIES
-- =====================================================

-- Anyone can view variants of active products
CREATE POLICY "Anyone can view product variants"
  ON product_variants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM products 
      WHERE products.id = product_variants.product_id 
      AND products.is_active = true
    )
  );

-- Vendors can manage their product variants
CREATE POLICY "Vendors can manage own product variants"
  ON product_variants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM products 
      WHERE products.id = product_variants.product_id 
      AND products.vendor_id = get_vendor_id()
    )
  );

-- Admins can manage all variants
CREATE POLICY "Admins can manage all variants"
  ON product_variants FOR ALL
  USING (is_admin());

-- =====================================================
-- ADDRESSES POLICIES
-- =====================================================

-- Users can manage their own addresses
CREATE POLICY "Users can manage own addresses"
  ON addresses FOR ALL
  USING (user_id = auth.uid());

-- Admins can view all addresses
CREATE POLICY "Admins can view all addresses"
  ON addresses FOR SELECT
  USING (is_admin());

-- =====================================================
-- CART ITEMS POLICIES
-- =====================================================

-- Users can manage their own cart
CREATE POLICY "Users can manage own cart"
  ON cart_items FOR ALL
  USING (user_id = auth.uid());

-- =====================================================
-- ORDERS POLICIES
-- =====================================================

-- Users can view their own orders
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  USING (user_id = auth.uid());

-- Users can create orders
CREATE POLICY "Users can create orders"
  ON orders FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- System can insert order items (via service role)
CREATE POLICY "System can insert order items"
  ON order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND orders.user_id = auth.uid()
    )
  );

-- =====================================================
-- BANK PAYMENTS POLICIES
-- =====================================================

-- Users can view their own payments
CREATE POLICY "Users can view own payments"
  ON bank_payments FOR SELECT
  USING (user_id = auth.uid());

-- Users can submit payments for their orders
CREATE POLICY "Users can submit payments"
  ON bank_payments FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = bank_payments.order_id 
      AND orders.user_id = auth.uid()
    )
  );

-- Admins can manage all payments
CREATE POLICY "Admins can manage payments"
  ON bank_payments FOR ALL
  USING (is_admin());

-- =====================================================
-- RETURNS POLICIES
-- =====================================================

-- Users can view their own returns
CREATE POLICY "Users can view own returns"
  ON returns FOR SELECT
  USING (user_id = auth.uid());

-- Users can request returns
CREATE POLICY "Users can request returns"
  ON returns FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Admins can manage all returns
CREATE POLICY "Admins can manage returns"
  ON returns FOR ALL
  USING (is_admin());

-- Vendors can view returns for their products
CREATE POLICY "Vendors can view relevant returns"
  ON returns FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM order_items 
      WHERE order_items.id = returns.order_item_id 
      AND order_items.vendor_id = get_vendor_id()
    )
  );

-- =====================================================
-- REVIEWS POLICIES
-- =====================================================

-- Anyone can view approved reviews
CREATE POLICY "Anyone can view approved reviews"
  ON reviews FOR SELECT
  USING (is_approved = true);

-- Users can view their own reviews
CREATE POLICY "Users can view own reviews"
  ON reviews FOR SELECT
  USING (user_id = auth.uid());

-- Users can create reviews
CREATE POLICY "Users can create reviews"
  ON reviews FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own reviews
CREATE POLICY "Users can update own reviews"
  ON reviews FOR UPDATE
  USING (user_id = auth.uid());

-- Admins can manage all reviews
CREATE POLICY "Admins can manage reviews"
  ON reviews FOR ALL
  USING (is_admin());

-- =====================================================
-- WISHLISTS POLICIES
-- =====================================================

-- Users can manage their own wishlist
CREATE POLICY "Users can manage own wishlist"
  ON wishlists FOR ALL
  USING (user_id = auth.uid());

-- =====================================================
-- NOTIFICATIONS POLICIES
-- =====================================================

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Admins can manage notifications
CREATE POLICY "Admins can manage notifications"
  ON notifications FOR ALL
  USING (is_admin());

-- =====================================================
-- AUDIT LOGS POLICIES
-- =====================================================

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (is_admin());

-- System inserts audit logs (service role)
CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- STORE SETTINGS POLICIES
-- =====================================================

-- Anyone can view store settings
CREATE POLICY "Anyone can view store settings"
  ON store_settings FOR SELECT
  USING (true);

-- Only super admins can modify store settings
CREATE POLICY "Super admins can manage store settings"
  ON store_settings FOR ALL
  USING (get_user_role() = 'super_admin');
-- =====================================================
-- ANALYTICS & REPORTING VIEWS
-- =====================================================

-- Sales summary by date
CREATE OR REPLACE VIEW sales_by_date AS
SELECT 
  DATE(created_at) as sale_date,
  COUNT(*) as total_orders,
  SUM(total_amount) as total_revenue,
  AVG(total_amount) as average_order_value,
  COUNT(CASE WHEN status = 'delivered' THEN 1 END) as completed_orders,
  COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders
FROM orders
GROUP BY DATE(created_at)
ORDER BY sale_date DESC;

-- Sales summary by vendor
CREATE OR REPLACE VIEW sales_by_vendor AS
SELECT 
  vp.id as vendor_id,
  vp.business_name,
  COUNT(DISTINCT oi.order_id) as total_orders,
  SUM(oi.total_price) as total_revenue,
  AVG(oi.total_price) as average_item_value,
  COUNT(oi.id) as items_sold
FROM vendor_profiles vp
LEFT JOIN order_items oi ON vp.id = oi.vendor_id
LEFT JOIN orders o ON oi.order_id = o.id AND o.status NOT IN ('cancelled', 'refunded')
GROUP BY vp.id, vp.business_name
ORDER BY total_revenue DESC NULLS LAST;

-- Product performance
CREATE OR REPLACE VIEW product_performance AS
SELECT 
  p.id as product_id,
  p.name as product_name,
  vp.business_name as vendor_name,
  c.name as category_name,
  p.stock_quantity,
  p.price,
  COALESCE(SUM(oi.quantity), 0) as total_sold,
  COALESCE(SUM(oi.total_price), 0) as total_revenue,
  COALESCE(AVG(r.rating), 0) as average_rating,
  COUNT(DISTINCT r.id) as review_count,
  COUNT(DISTINCT w.id) as wishlist_count
FROM products p
LEFT JOIN vendor_profiles vp ON p.vendor_id = vp.id
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN order_items oi ON p.id = oi.product_id
LEFT JOIN orders o ON oi.order_id = o.id AND o.status NOT IN ('cancelled', 'refunded')
LEFT JOIN reviews r ON p.id = r.product_id AND r.is_approved = true
LEFT JOIN wishlists w ON p.id = w.product_id
GROUP BY p.id, p.name, vp.business_name, c.name, p.stock_quantity, p.price
ORDER BY total_sold DESC;

-- Low stock products
CREATE OR REPLACE VIEW low_stock_products AS
SELECT 
  p.id,
  p.name,
  p.sku,
  p.stock_quantity,
  p.low_stock_threshold,
  vp.business_name as vendor_name,
  vp.user_id as vendor_user_id
FROM products p
JOIN vendor_profiles vp ON p.vendor_id = vp.id
WHERE p.stock_quantity <= p.low_stock_threshold
AND p.is_active = true
ORDER BY p.stock_quantity ASC;

-- Customer metrics
CREATE OR REPLACE VIEW customer_metrics AS
SELECT 
  p.id as customer_id,
  p.email,
  p.full_name,
  p.created_at as joined_at,
  COUNT(DISTINCT o.id) as total_orders,
  COALESCE(SUM(o.total_amount), 0) as total_spent,
  COALESCE(AVG(o.total_amount), 0) as average_order_value,
  MAX(o.created_at) as last_order_date
FROM profiles p
LEFT JOIN orders o ON p.id = o.user_id AND o.status NOT IN ('cancelled', 'pending_payment')
WHERE p.role = 'customer'
GROUP BY p.id, p.email, p.full_name, p.created_at
ORDER BY total_spent DESC;

-- Payment verification queue
CREATE OR REPLACE VIEW payment_verification_queue AS
SELECT 
  bp.id as payment_id,
  bp.order_id,
  o.order_number,
  bp.user_id,
  p.email as customer_email,
  p.full_name as customer_name,
  bp.bank_name,
  bp.account_holder,
  bp.reference_number,
  bp.amount,
  bp.payment_date,
  bp.proof_of_payment_url,
  bp.status,
  bp.created_at as submitted_at
FROM bank_payments bp
JOIN orders o ON bp.order_id = o.id
JOIN profiles p ON bp.user_id = p.id
WHERE bp.status IN ('submitted', 'under_review')
ORDER BY bp.created_at ASC;

-- Returns queue
CREATE OR REPLACE VIEW returns_queue AS
SELECT 
  r.id as return_id,
  r.order_id,
  o.order_number,
  r.user_id,
  p.email as customer_email,
  p.full_name as customer_name,
  oi.product_name,
  oi.quantity,
  oi.total_price,
  r.reason,
  r.description,
  r.status,
  r.created_at as requested_at
FROM returns r
JOIN orders o ON r.order_id = o.id
JOIN profiles p ON r.user_id = p.id
JOIN order_items oi ON r.order_item_id = oi.id
WHERE r.status IN ('requested', 'approved')
ORDER BY r.created_at ASC;

-- Monthly revenue summary
CREATE OR REPLACE VIEW monthly_revenue AS
SELECT 
  DATE_TRUNC('month', o.created_at) as month,
  COUNT(*) as total_orders,
  SUM(o.total_amount) as total_revenue,
  AVG(o.total_amount) as avg_order_value,
  COUNT(DISTINCT o.user_id) as unique_customers
FROM orders o
WHERE o.status NOT IN ('cancelled', 'pending_payment')
GROUP BY DATE_TRUNC('month', o.created_at)
ORDER BY month DESC;

-- Category performance
CREATE OR REPLACE VIEW category_performance AS
SELECT 
  c.id as category_id,
  c.name as category_name,
  COUNT(DISTINCT p.id) as product_count,
  COALESCE(SUM(oi.quantity), 0) as items_sold,
  COALESCE(SUM(oi.total_price), 0) as total_revenue
FROM categories c
LEFT JOIN products p ON c.id = p.category_id AND p.is_active = true
LEFT JOIN order_items oi ON p.id = oi.product_id
LEFT JOIN orders o ON oi.order_id = o.id AND o.status NOT IN ('cancelled', 'refunded')
WHERE c.is_active = true
GROUP BY c.id, c.name
ORDER BY total_revenue DESC;-- =====================================================
-- SEED DATA FOR ELECTRICAL COMPONENT STORE
-- =====================================================

-- Insert categories
INSERT INTO categories (id, name, slug, description, sort_order) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Circuit Breakers', 'circuit-breakers', 'Protective devices for electrical circuits', 1),
  ('22222222-2222-2222-2222-222222222222', 'Switches & Sockets', 'switches-sockets', 'Wall switches and electrical sockets', 2),
  ('33333333-3333-3333-3333-333333333333', 'Cables & Wiring', 'cables-wiring', 'Electrical cables and wiring solutions', 3),
  ('44444444-4444-4444-4444-444444444444', 'Lighting', 'lighting', 'LED lights, bulbs, and fixtures', 4),
  ('55555555-5555-5555-5555-555555555555', 'Distribution Boards', 'distribution-boards', 'Main and sub distribution boards', 5),
  ('66666666-6666-6666-6666-666666666666', 'Conduits & Trunking', 'conduits-trunking', 'Cable management systems', 6),
  ('77777777-7777-7777-7777-777777777777', 'Motors & Drives', 'motors-drives', 'Electric motors and variable drives', 7),
  ('88888888-8888-8888-8888-888888888888', 'Tools & Testers', 'tools-testers', 'Electrical testing and installation tools', 8);

-- Insert store settings
INSERT INTO store_settings (key, value, description) VALUES
  ('store_name', '"Volt Electric Supplies"', 'Store display name'),
  ('store_currency', '"ZAR"', 'Default currency'),
  ('store_email', '"info@voltelectric.co.za"', 'Store contact email'),
  ('store_phone', '"+27 11 123 4567"', 'Store contact phone'),
  ('shipping_flat_rate', '99.00', 'Flat rate shipping cost'),
  ('free_shipping_threshold', '1500.00', 'Order amount for free shipping'),
  ('tax_rate', '15.00', 'VAT percentage'),
  ('bank_details', '{"bank_name": "First National Bank", "account_name": "Volt Electric Supplies", "account_number": "62123456789", "branch_code": "250655", "reference_prefix": "VES"}', 'Bank details for manual payments');
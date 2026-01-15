-- Add vendor types, account tiers, image storage, verification, payment methods, currencies, and location tracking

-- Update sellers table with new fields
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS vendor_type TEXT DEFAULT 'freelance_reseller' CHECK (vendor_type IN ('startup_reseller', 'established_reseller', 'enterprise_reseller', 'freelance_reseller'));
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS account_tier TEXT DEFAULT 'basic' CHECK (account_tier IN ('basic', 'professional', 'business'));
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS identity_document_url TEXT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS company_registration_number TEXT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS tax_number TEXT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS verification_documents JSONB DEFAULT '[]'::jsonb;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'under_review', 'approved', 'rejected'));
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS monthly_fee NUMERIC DEFAULT 0;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS account_tier_expires_at TIMESTAMP WITH TIME ZONE;

-- Update profiles table with account tiers and profile images
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_tier TEXT DEFAULT 'basic' CHECK (account_tier IN ('basic', 'professional', 'business'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS monthly_fee NUMERIC DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_tier_expires_at TIMESTAMP WITH TIME ZONE;

-- Update products table for multi-image support
ALTER TABLE products ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS primary_image_url TEXT;

-- Update orders table with payment and delivery options
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'cash_on_delivery' CHECK (payment_type IN ('cash_on_delivery', 'bank_transfer', 'courier_payment'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS currency_code TEXT DEFAULT 'ZAR';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_service TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_cost NUMERIC DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS requires_courier BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS bank_payment_proof_url TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS banking_details TEXT;

-- Create currency_rates table for African currencies
CREATE TABLE IF NOT EXISTS currency_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  currency_code TEXT NOT NULL UNIQUE,
  currency_name TEXT NOT NULL,
  country TEXT NOT NULL,
  symbol TEXT NOT NULL,
  exchange_rate_to_zar NUMERIC DEFAULT 1.0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert common African currencies
INSERT INTO currency_rates (currency_code, currency_name, country, symbol, exchange_rate_to_zar) VALUES
('ZAR', 'South African Rand', 'South Africa', 'R', 1.0),
('NGN', 'Nigerian Naira', 'Nigeria', '₦', 0.043),
('KES', 'Kenyan Shilling', 'Kenya', 'KSh', 0.12),
('GHS', 'Ghanaian Cedi', 'Ghana', 'GH₵', 1.35),
('TZS', 'Tanzanian Shilling', 'Tanzania', 'TSh', 0.0067),
('UGX', 'Ugandan Shilling', 'Uganda', 'USh', 0.0042),
('EGP', 'Egyptian Pound', 'Egypt', 'E£', 0.33),
('MAD', 'Moroccan Dirham', 'Morocco', 'MAD', 1.62),
('BWP', 'Botswana Pula', 'Botswana', 'P', 1.18),
('ZMW', 'Zambian Kwacha', 'Zambia', 'ZK', 0.78)
ON CONFLICT (currency_code) DO NOTHING;

-- Create account_tier_features table
CREATE TABLE IF NOT EXISTS account_tier_features (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tier_name TEXT NOT NULL UNIQUE CHECK (tier_name IN ('basic', 'professional', 'business')),
  user_type TEXT NOT NULL CHECK (user_type IN ('customer', 'vendor')),
  monthly_fee NUMERIC DEFAULT 0,
  max_products INTEGER,
  max_images_per_product INTEGER,
  commission_discount NUMERIC DEFAULT 0,
  priority_support BOOLEAN DEFAULT false,
  analytics_access BOOLEAN DEFAULT false,
  custom_branding BOOLEAN DEFAULT false,
  api_access BOOLEAN DEFAULT false,
  features JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert account tier features for vendors
INSERT INTO account_tier_features (tier_name, user_type, monthly_fee, max_products, max_images_per_product, commission_discount, priority_support, analytics_access, custom_branding, api_access, features) VALUES
('basic', 'vendor', 0, 50, 3, 0, false, false, false, false, '["Up to 50 products", "3 images per product", "15% commission", "Standard support"]'::jsonb),
('professional', 'vendor', 299, 200, 10, 2, true, true, false, false, '["Up to 200 products", "10 images per product", "13% commission (2% discount)", "Priority support", "Analytics dashboard"]'::jsonb),
('business', 'vendor', 799, -1, 20, 5, true, true, true, true, '["Unlimited products", "20 images per product", "10% commission (5% discount)", "Priority support", "Advanced analytics", "Custom branding", "API access"]'::jsonb)
ON CONFLICT (tier_name) DO NOTHING;

-- Insert account tier features for customers
INSERT INTO account_tier_features (tier_name, user_type, monthly_fee, max_products, max_images_per_product, commission_discount, priority_support, analytics_access, custom_branding, api_access, features) VALUES
('basic', 'customer', 0, 0, 0, 0, false, false, false, false, '["Browse products", "Place orders", "Standard support"]'::jsonb),
('professional', 'customer', 49, 0, 0, 0, true, false, false, false, '["Early access to sales", "Priority support", "Free shipping on orders over R500"]'::jsonb),
('business', 'customer', 199, 0, 0, 0, true, true, false, false, '["Bulk order discounts", "Priority support", "Free shipping", "Purchase analytics", "Dedicated account manager"]'::jsonb)
ON CONFLICT (tier_name) DO NOTHING;

-- Update order_tracking table for enhanced live location
ALTER TABLE order_tracking ADD COLUMN IF NOT EXISTS accuracy NUMERIC;
ALTER TABLE order_tracking ADD COLUMN IF NOT EXISTS speed NUMERIC;
ALTER TABLE order_tracking ADD COLUMN IF NOT EXISTS heading NUMERIC;
ALTER TABLE order_tracking ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Create courier_services table
CREATE TABLE IF NOT EXISTS courier_services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_phone TEXT,
  contact_email TEXT,
  base_rate NUMERIC DEFAULT 0,
  per_km_rate NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  coverage_areas JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create vendor_documents table for verification
CREATE TABLE IF NOT EXISTS vendor_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('identity_document', 'company_registration', 'tax_certificate', 'bank_statement', 'proof_of_address', 'other')),
  document_url TEXT NOT NULL,
  document_name TEXT,
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  rejected_reason TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID REFERENCES profiles(id)
);

-- Enable RLS on new tables
ALTER TABLE currency_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_tier_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE courier_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Public can view currencies" ON currency_rates;
CREATE POLICY "Public can view currencies" ON currency_rates FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public can view account tiers" ON account_tier_features;
CREATE POLICY "Public can view account tiers" ON account_tier_features FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public can view active couriers" ON courier_services;
CREATE POLICY "Public can view active couriers" ON courier_services FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Vendors can upload own documents" ON vendor_documents;
CREATE POLICY "Vendors can upload own documents" ON vendor_documents FOR INSERT WITH CHECK (
  seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Vendors can view own documents" ON vendor_documents;
CREATE POLICY "Vendors can view own documents" ON vendor_documents FOR SELECT USING (
  seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admins can view all documents" ON vendor_documents;
CREATE POLICY "Admins can view all documents" ON vendor_documents FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

DROP POLICY IF EXISTS "Admins can update documents" ON vendor_documents;
CREATE POLICY "Admins can update documents" ON vendor_documents FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sellers_vendor_type ON sellers(vendor_type);
CREATE INDEX IF NOT EXISTS idx_sellers_verification_status ON sellers(verification_status);
CREATE INDEX IF NOT EXISTS idx_products_seller_id ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_type ON orders(payment_type);
CREATE INDEX IF NOT EXISTS idx_orders_currency_code ON orders(currency_code);
CREATE INDEX IF NOT EXISTS idx_vendor_documents_seller_id ON vendor_documents(seller_id);
CREATE INDEX IF NOT EXISTS idx_vendor_documents_verification_status ON vendor_documents(verification_status);

COMMENT ON TABLE currency_rates IS 'Supported African currencies with exchange rates';
COMMENT ON TABLE account_tier_features IS 'Features and pricing for different account tiers';
COMMENT ON TABLE courier_services IS 'Available courier services for delivery';
COMMENT ON TABLE vendor_documents IS 'Vendor verification documents';

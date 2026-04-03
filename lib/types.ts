export interface Product {
  id: string
  name: string
  name_pt?: string // Added for Portuguese translation
  description: string
  description_pt?: string // Added for Portuguese translation
  category: string
  category_id?: string // Link to categories table
  manufacturer: string
  price: number
  currency?: string // Added for base currency
  stock_quantity: number
  sku?: string // Added for product SKU
  image_url?: string
  primary_image_url?: string // Added for primary product image
  images?: string[] // Added for multiple product images
  specifications?: string | any // Now plain text, `any` included for legacy JSON compatibility
  technical_documents?: string[] // Added for technical documentation URLs
  category_path?: string[] // Added for breadcrumbs
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  name_pt?: string
  parent_id?: string
  slug: string
  level: number
  created_at: string
  updated_at: string
}

export interface CartItem {
  id: string
  user_id: string
  product_id: string
  quantity: number
  product?: Product
}

export interface Order {
  id: string
  user_id: string
  user?: UserProfile // Added for user profile relationship
  status: string
  total_amount: number
  tax_amount: number
  delivery_fee: number // Added for delivery fee
  shipping_address: string
  billing_address: string
  payment_method: string
  payment_status?: string
  payment_type: "cash_on_delivery" | "bank_transfer" | "courier_payment" // Added for payment type
  currency_code: string // Added for currency code
  courier_service?: string // Added for courier service
  courier_cost: number // Added for courier cost
  requires_courier: boolean // Added for requires courier
  bank_payment_proof_url?: string // Added for bank payment proof URL
  banking_details?: string // Added for banking details
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  quantity: number
  unit_price: number
  product?: Product
}

export interface UserProfile {
  id: string
  email: string
  first_name?: string
  last_name?: string
  phone?: string
  role: "customer" | "admin" | "super_admin"
  account_tier?: "basic" | "professional" | "business"
  profile_image_url?: string
  monthly_fee?: number
  account_tier_expires_at?: string
  is_blocked?: boolean // Added for block functionality
  blocked_at?: string // Added for block timestamp
  block_reason?: string // Added for block reason
  created_at: string
  updated_at: string
}


export interface Address {
  id: string
  user_id: string
  address_type: "shipping" | "billing"
  full_address: string
  city: string
  postal_code: string
  is_default: boolean
  created_at: string
}

export interface Message {
  id: string
  sender_id: string
  receiver_id: string
  product_id: string | null
  message: string
  is_read: boolean
  created_at: string
}


export interface Currency {
  id: string
  currency_code: string
  currency_name: string
  country: string
  symbol: string
  exchange_rate_to_zar: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AccountTierFeatures {
  id: string
  tier_name: "basic" | "professional" | "business"
  user_type: "customer"
  monthly_fee: number
  max_products?: number
  max_images_per_product?: number
  commission_discount: number
  priority_support: boolean
  analytics_access: boolean
  custom_branding: boolean
  api_access: boolean
  features: string[]
  created_at: string
}

export interface CourierService {
  id: string
  name: string
  contact_phone?: string
  contact_email?: string
  base_rate: number
  per_km_rate: number
  is_active: boolean
  coverage_areas: string[]
  created_at: string
}

export interface OrderTracking {
  id: string
  order_id: string
  status: string
  location?: string
  latitude?: number
  longitude?: number
  accuracy?: number
  speed?: number
  heading?: number
  description?: string
  updated_by: string
  timestamp: string
  created_at: string
}

export type AccountStatus = "pending" | "approved" | "rejected"
export type UserRole = "customer" | "vendor_admin" | "admin" | "super_admin" | "vendor_manager" | "vendor_sales" | "vendor_general"

export interface Product {
  id: string
  name: string
  description: string
  category: string
  brand: string
  price: number
  stock_quantity: number
  image_url?: string
  sku?: string // Added sku
  specifications?: Record<string, unknown> | null // Modified specifications
  created_at: string
  updated_at: string
  // New fields
  seller_id: string; // UUID of the seller
  status: 'pending' | 'approved' | 'rejected'; // Moderation status
  is_featured: boolean;
  // Nested profile for seller information
  profiles?: {
    first_name?: string;
    last_name?: string;
  };
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
  status: string
  total_amount: number
  tax_amount: number
  shipping_address: string
  billing_address: string
  payment_method: string
  payment_status: string // Added payment_status
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
  role: UserRole
  name?: string // Added name
  account_status: AccountStatus
  role_requested?: UserRole
  created_at: string
  updated_at: string
}

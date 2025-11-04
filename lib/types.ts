export interface Product {
  id: string
  name: string
  description: string
  category: string
  brand: string
  price: number
  stock_quantity: number
  image_url?: string
  specifications?: Record<string, unknown>
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
  status: string
  total_amount: number
  tax_amount: number
  shipping_address: string
  billing_address: string
  payment_method: string
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
  role: string
  created_at: string
  updated_at: string
}

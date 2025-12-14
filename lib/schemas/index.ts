import { z } from 'zod';

// Utility schema for UUIDs
const uuidSchema = z.string().uuid();

// Product Schema
export const ProductSchema = z.object({
  id: uuidSchema.optional(), // Supabase generates UUIDs, so optional for creation
  name: z.string().min(1, 'Product name is required'),
  description: z.string().min(1, 'Product description is required'),
  category: z.string().min(1, 'Product category is required'),
  brand: z.string().min(1, 'Product brand is required'),
  price: z.number().positive('Price must be a positive number'),
  stock_quantity: z.number().int().min(0, 'Stock quantity cannot be negative'),
  image_url: z.string().url('Image URL must be a valid URL').optional().nullable(),
  sku: z.string().optional().nullable(),
  specifications: z.record(z.any()).nullable().optional(), // Flexible for various specifications
  created_at: z.string().datetime().optional(), // Auto-generated
  updated_at: z.string().datetime().optional(), // Auto-generated
  seller_id: uuidSchema.optional(), // Will be set by API for new products
  status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
  is_featured: z.boolean().default(false),
  // profiles relation is not part of the base product input, but might be fetched
  profiles: z.object({
    first_name: z.string().optional(),
    last_name: z.string().optional(),
  }).optional(),
});

// CartItem Schema
export const CartItemSchema = z.object({
  id: uuidSchema.optional(),
  user_id: uuidSchema.optional(), // Will be set by API
  product_id: uuidSchema,
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  product: ProductSchema.optional(), // Nested product data
});

// Order Schema
export const OrderSchema = z.object({
  id: uuidSchema.optional(),
  user_id: uuidSchema.optional(), // Will be set by API
  status: z.string().min(1, 'Order status is required'), // Consider z.enum for specific statuses
  total_amount: z.number().positive('Total amount must be positive'),
  tax_amount: z.number().min(0, 'Tax amount cannot be negative'),
  shipping_address: z.string().min(1, 'Shipping address is required'),
  billing_address: z.string().min(1, 'Billing address is required'),
  payment_method: z.string().min(1, 'Payment method is required'),
  payment_status: z.string().min(1, 'Payment status is required'), // Consider z.enum for specific statuses
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

// OrderItem Schema
export const OrderItemSchema = z.object({
  id: uuidSchema.optional(),
  order_id: uuidSchema.optional(),
  product_id: uuidSchema,
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  unit_price: z.number().positive('Unit price must be positive'),
  product: ProductSchema.optional(), // Nested product data
});

// UserProfile Schema
export const UserProfileSchema = z.object({
  id: uuidSchema.optional(), // User ID is usually the same as auth.users id
  email: z.string().email('Invalid email address'),
  first_name: z.string().min(1, 'First name is required').optional(),
  last_name: z.string().min(1, 'Last name is required').optional(),
  phone: z.string().optional().nullable(),
  role: z.enum(['customer', 'vendor', 'admin', 'super_admin']).default('customer'),
  name: z.string().optional(), // Derived or combined name
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

// Admin User Creation Schema (for API input)
export const AdminUserCreationSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  phone: z.string().optional().nullable(),
});

// Login Schema
export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Signup Schema (basic user signup)
export const SignupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  phone: z.string().optional().nullable(),
});

// BankingDetails Schema
export const BankingDetailsSchema = z.object({
  account_holder: z.string().min(1, 'Account holder name is required'),
  bank_name: z.string().min(1, 'Bank name is required'),
  account_number: z.string().min(1, 'Account number is required'),
  branch_code: z.string().min(1, 'Branch code is required'),
  swift_code: z.string().min(1, 'SWIFT/BIC code is required').optional().nullable(),
  reference_note: z.string().optional().nullable(),
});

// UpdateOrder Schema (for PATCH requests)
export const UpdateOrderSchema = z.object({
  status: z.string().min(1, 'Order status is required').optional(),
  payment_status: z.string().min(1, 'Payment status is required').optional(),
});

// ProductReport Schema
export const ProductReportSchema = z.object({
  id: uuidSchema.optional(),
  product_id: uuidSchema,
  reporter_id: uuidSchema,
  reason: z.string().min(1, 'Reason is required'),
  description: z.string().optional().nullable(),
  status: z.enum(['pending', 'reviewed', 'dismissed', 'acted_upon']).default('pending'),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  products: z.object({ // Joined product data
    id: uuidSchema,
    name: z.string(),
  }).optional(),
  profiles: z.object({ // Joined reporter profile data
    id: uuidSchema,
    email: z.string().email(),
  }).optional(),
});

// UpdateProductReport Status Schema (for PATCH requests)
export const UpdateProductReportStatusSchema = z.object({
  status: z.enum(['pending', 'reviewed', 'dismissed', 'acted_upon']),
});

// Checkout Form Schema
export const CheckoutFormSchema = z.object({
  firstName: z.string().min(1, 'First Name is required'),
  lastName: z.string().min(1, 'Last Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone number is required'),
  shippingAddress: z.string().min(1, 'Shipping Address is required'),
  shippingCity: z.string().min(1, 'Shipping City is required'),
  shippingZip: z.string().min(1, 'Shipping Zip Code is required'),
  billingAddress: z.string().min(1, 'Billing Address is required'),
  billingCity: z.string().min(1, 'Billing City is required'),
  billingZip: z.string().min(1, 'Billing Zip Code is required'),
  paymentMethod: z.enum(['bank_transfer', 'cash_on_delivery', 'card']),
});



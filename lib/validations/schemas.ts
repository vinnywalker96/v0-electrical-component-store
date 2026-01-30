import { z } from 'zod'

// User authentication schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  phone: z.string().optional(),
})

export const passwordResetSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

// Product schemas
export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200, 'Product name too long'),
  name_pt: z.string().max(200, 'Portuguese name too long').optional(),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000, 'Description too long'),
  description_pt: z.string().max(2000, 'Portuguese description too long').optional(),
  category: z.string().min(1, 'Category is required'),
  manufacturer: z.string().max(100, 'Manufacturer name too long').optional(),
  price: z.number().positive('Price must be positive').max(999999.99, 'Price too high'),
  stockQuantity: z.number().int().min(0, 'Stock quantity cannot be negative'),
  specifications: z.record(z.any()).optional(),
  technicalDocuments: z.array(z.string().url('Invalid URL')).optional(),
  images: z.array(z.string().url('Invalid image URL')).optional(),
})

export const productUpdateSchema = productSchema.partial()

// Order schemas
export const orderCreateSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  sellerId: z.string().uuid('Invalid seller ID').optional(),
  shippingAddress: z.string().min(10, 'Shipping address is required'),
  billingAddress: z.string().min(10, 'Billing address is required'),
  paymentMethod: z.enum(['cash_on_delivery', 'bank_transfer', 'card']),
  currencyCode: z.string().length(3, 'Invalid currency code'),
  orderItems: z.array(z.object({
    productId: z.string().uuid('Invalid product ID'),
    quantity: z.number().int().positive('Quantity must be positive'),
    unitPrice: z.number().positive('Unit price must be positive'),
  })).min(1, 'At least one item is required'),
})

export const orderStatusUpdateSchema = z.object({
  status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']),
  trackingNumber: z.string().optional(),
  notes: z.string().optional(),
})

// User profile schemas
export const profileUpdateSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  phone: z.string().optional(),
  profileImageUrl: z.string().url('Invalid image URL').optional(),
})

export const addressSchema = z.object({
  addressType: z.enum(['shipping', 'billing']),
  fullAddress: z.string().min(10, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  isDefault: z.boolean().optional(),
})

// Admin schemas
export const userBlockSchema = z.object({
  reason: z.string().min(1, 'Block reason is required').max(500, 'Reason too long'),
})

export const bulkActionSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1, 'At least one user must be selected'),
  action: z.enum(['block', 'unblock', 'delete']),
  reason: z.string().optional(),
})

// Search and filter schemas
export const productSearchSchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  manufacturer: z.string().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  inStock: z.boolean().optional(),
  sortBy: z.enum(['name', 'price', 'created_at', 'rating']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
})

export const userSearchSchema = z.object({
  query: z.string().optional(),
  role: z.enum(['customer', 'vendor', 'admin', 'super_admin']).optional(),
  status: z.enum(['active', 'blocked']).optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
})

// Newsletter schema
export const newsletterSubscriptionSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().optional(),
})

// Contact form schema
export const contactFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  email: z.string().email('Invalid email address'),
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject too long'),
  message: z.string().min(10, 'Message must be at least 10 characters').max(2000, 'Message too long'),
})

// Review schema
export const productReviewSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  rating: z.number().int().min(1).max(5),
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  comment: z.string().min(10, 'Comment must be at least 10 characters').max(1000, 'Comment too long'),
})

// Cart schema
export const cartItemSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().int().positive('Quantity must be positive'),
})

// Checkout schema
export const checkoutSchema = z.object({
  shippingAddress: z.string().min(10, 'Shipping address is required'),
  billingAddress: z.string().min(10, 'Billing address is required'),
  paymentMethod: z.enum(['cash_on_delivery', 'bank_transfer', 'card']),
  notes: z.string().optional(),
})

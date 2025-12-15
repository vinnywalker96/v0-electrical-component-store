import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

const baseSignupFields = {
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
}

export const signupSchema = z.object(baseSignupFields).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

export const vendorSignupSchema = z
  .object({
    ...baseSignupFields,
    storeName: z.string().min(3, "Store name must be at least 3 characters"),
    phone: z.string().min(10, "Phone number must be at least 10 digits"),
    businessAddress: z.string().min(10, "Business address is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })

export type LoginInput = z.infer<typeof loginSchema>
export type SignupInput = z.infer<typeof signupSchema>
export type VendorSignupInput = z.infer<typeof vendorSignupSchema>

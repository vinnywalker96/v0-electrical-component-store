"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createClient } from "@/lib/supabase/client"
import { vendorSignupSchema, type VendorSignupInput } from "@/lib/schemas/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

export default function VendorSignupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VendorSignupInput>({
    resolver: zodResolver(vendorSignupSchema),
  })

  async function onSubmit(data: VendorSignupInput) {
    setLoading(true)

    try {
      // Create auth user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || window.location.origin,
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
          },
        },
      })

      if (signUpError) throw signUpError

      if (authData.user) {
        // Create profile with vendor role
        const { error: profileError } = await supabase.from("profiles").insert({
          id: authData.user.id,
          email: data.email,
          first_name: data.firstName,
          last_name: data.lastName,
          phone: data.phone,
          role: "vendor",
        })

        if (profileError && !profileError.message.includes("duplicate")) {
          console.error("[v0] Profile error:", profileError)
        }

        // Create seller profile
        const { error: sellerError } = await supabase.from("sellers").insert({
          user_id: authData.user.id,
          store_name: data.storeName,
          business_address: data.businessAddress,
          contact_phone: data.phone,
          contact_email: data.email,
          commission_rate: 15.0,
          is_verified: false,
          is_active: true,
        })

        if (sellerError) {
          console.error("[v0] Seller creation error:", sellerError)
        }
      }

      setSuccess(true)
      setTimeout(() => {
        router.push("/auth/vendor/login?message=signup-success")
      }, 2000)
    } catch (err: any) {
      console.error("[v0] Vendor signup error:", err)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="text-green-600 text-5xl mb-4">✓</div>
            <h2 className="text-2xl font-bold mb-2">Vendor Account Created!</h2>
            <p className="text-slate-600">
              Your vendor account is pending verification. You'll be redirected to sign in.
            </p>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Become a Vendor</CardTitle>
          <p className="text-center text-sm text-slate-600">Start selling on KG Compponents</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">First Name</label>
                <Input {...register("firstName")} placeholder="John" disabled={loading} />
                {errors.firstName && <p className="text-red-600 text-xs mt-1">{errors.firstName.message}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Last Name</label>
                <Input {...register("lastName")} placeholder="Doe" disabled={loading} />
                {errors.lastName && <p className="text-red-600 text-xs mt-1">{errors.lastName.message}</p>}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Email</label>
              <Input {...register("email")} type="email" placeholder="vendor@example.com" disabled={loading} />
              {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Phone Number</label>
              <Input {...register("phone")} placeholder="+27 123 456 7890" disabled={loading} />
              {errors.phone && <p className="text-red-600 text-xs mt-1">{errors.phone.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Store Name</label>
              <Input {...register("storeName")} placeholder="My Electronics Store" disabled={loading} />
              {errors.storeName && <p className="text-red-600 text-xs mt-1">{errors.storeName.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Business Address</label>
              <Textarea
                {...register("businessAddress")}
                placeholder="123 Main St, City, Province"
                disabled={loading}
                rows={2}
              />
              {errors.businessAddress && <p className="text-red-600 text-xs mt-1">{errors.businessAddress.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Password</label>
              <Input {...register("password")} type="password" placeholder="••••••••" disabled={loading} />
              {errors.password && <p className="text-red-600 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Confirm Password</label>
              <Input {...register("confirmPassword")} type="password" placeholder="••••••••" disabled={loading} />
              {errors.confirmPassword && <p className="text-red-600 text-xs mt-1">{errors.confirmPassword.message}</p>}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
              <p className="text-blue-800">Commission: 15% per sale</p>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Creating account..." : "Create Vendor Account"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <p className="text-slate-600">
              Already have a vendor account?{" "}
              <Link href="/auth/vendor/login" className="text-blue-600 hover:text-blue-700 font-semibold">
                Sign in
              </Link>
            </p>
          </div>

          <Link href="/" className="block text-center mt-4 text-sm text-blue-600 hover:text-blue-700">
            Back to Home
          </Link>
        </CardContent>
      </Card>
    </main>
  )
}

"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase/client"
import { Store, AlertCircle } from "lucide-react"

export default function SellerRegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    storeName: "",
    storeDescription: "",
    businessAddress: "",
    phoneNumber: "",
    bankAccountName: "",
    bankAccountNumber: "",
    bankName: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const supabase = createClient()

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setError("Please login first")
        router.push("/auth/login")
        return
      }

      // Create seller profile
      const { error: sellerError } = await supabase.from("sellers").insert({
        user_id: user.id,
        store_name: formData.storeName,
        store_description: formData.storeDescription,
        business_address: formData.businessAddress,
        phone_number: formData.phoneNumber,
        bank_account_name: formData.bankAccountName,
        bank_account_number: formData.bankAccountNumber,
        bank_name: formData.bankName,
        verification_status: "pending",
      })

      if (sellerError) throw sellerError

      // Update user profile role to seller
      await supabase.from("user_profiles").update({ role: "seller" }).eq("user_id", user.id)

      router.push("/seller/dashboard")
    } catch (err: any) {
      setError(err.message || "Failed to register as seller")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Store className="h-6 w-6 text-primary" />
            <CardTitle>Become a Seller</CardTitle>
          </div>
          <CardDescription>Start selling your products on KG Compponents marketplace</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="storeName">Store Name *</Label>
              <Input
                id="storeName"
                required
                value={formData.storeName}
                onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                placeholder="e.g., Tech Electronics Store"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="storeDescription">Store Description *</Label>
              <Textarea
                id="storeDescription"
                required
                value={formData.storeDescription}
                onChange={(e) => setFormData({ ...formData, storeDescription: e.target.value })}
                placeholder="Describe what you sell..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessAddress">Business Address *</Label>
              <Textarea
                id="businessAddress"
                required
                value={formData.businessAddress}
                onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
                placeholder="Full business address for product pickup"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number *</Label>
              <Input
                id="phoneNumber"
                type="tel"
                required
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                placeholder="+27 12 345 6789"
              />
            </div>

            <div className="border-t pt-6">
              <h3 className="font-semibold mb-4">Bank Account Details (for payments)</h3>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bankAccountName">Account Holder Name *</Label>
                  <Input
                    id="bankAccountName"
                    required
                    value={formData.bankAccountName}
                    onChange={(e) => setFormData({ ...formData, bankAccountName: e.target.value })}
                    placeholder="Full name on bank account"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bankAccountNumber">Account Number *</Label>
                  <Input
                    id="bankAccountNumber"
                    required
                    value={formData.bankAccountNumber}
                    onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                    placeholder="1234567890"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bankName">Bank Name *</Label>
                  <Input
                    id="bankName"
                    required
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    placeholder="e.g., FNB, Standard Bank"
                  />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Registering..." : "Register as Seller"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { AlertCircle } from "lucide-react"
import type { Address } from "@/lib/types"

interface AddressFormProps {
  userId: string
  address?: Address
}

export function AddressForm({ userId, address }: AddressFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState({
    addressType: address?.address_type || "shipping",
    fullAddress: address?.full_address || "",
    city: address?.city || "",
    postalCode: address?.postal_code || "",
    isDefault: address?.is_default || false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const supabase = createClient()

      const addressData = {
        user_id: userId,
        address_type: formData.addressType as "shipping" | "billing",
        full_address: formData.fullAddress,
        city: formData.city,
        postal_code: formData.postalCode,
        is_default: formData.isDefault,
      }

      if (address) {
        // Update existing address
        const { error: updateError } = await supabase.from("addresses").update(addressData).eq("id", address.id)

        if (updateError) throw updateError
      } else {
        // Create new address
        const { error: insertError } = await supabase.from("addresses").insert(addressData)

        if (insertError) throw insertError
      }

      // If set as default, unset other defaults
      if (formData.isDefault) {
        await supabase
          .from("addresses")
          .update({ is_default: false })
          .eq("user_id", userId)
          .neq("id", address?.id || "")
      }

      router.push("/protected/addresses")
      router.refresh()
    } catch (err: any) {
      setError(err.message || "Failed to save address")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="addressType">Address Type *</Label>
            <Select
              value={formData.addressType}
              onValueChange={(value) => setFormData({ ...formData, addressType: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="shipping">Shipping Address</SelectItem>
                <SelectItem value="billing">Billing Address</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullAddress">Street Address *</Label>
            <Textarea
              id="fullAddress"
              required
              value={formData.fullAddress}
              onChange={(e) => setFormData({ ...formData, fullAddress: e.target.value })}
              placeholder="Enter your complete street address"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                required
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="City"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="postalCode">Postal Code *</Label>
              <Input
                id="postalCode"
                required
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                placeholder="Postal Code"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isDefault"
              checked={formData.isDefault}
              onCheckedChange={(checked) => setFormData({ ...formData, isDefault: !!checked })}
            />
            <Label htmlFor="isDefault" className="cursor-pointer">
              Set as default address
            </Label>
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : address ? "Update Address" : "Save Address"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push("/protected/addresses")}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

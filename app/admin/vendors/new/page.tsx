"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export default function AdminCreateVendorPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    // User account details
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    phone: "",

    // Seller details
    store_name: "",
    store_description: "",
    business_address: "",
    contact_phone: "",
    contact_email: "",
    vendor_type: "freelance_reseller",
    commission_rate: 15,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.email || !formData.password || !formData.first_name || !formData.last_name ||
        !formData.store_name || !formData.business_address) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    if (formData.password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive"
      })
      return
    }

    setLoading(true)

    try {
      // Create the user account
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: formData.email,
        password: formData.password,
        email_confirm: true, // Auto-confirm email for admin-created accounts
      })

      if (authError) throw authError

      // Create the profile
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: authData.user.id,
          email: formData.email,
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          role: "vendor",
        })

      if (profileError) throw profileError

      // Create the seller record
      const { error: sellerError } = await supabase
        .from("sellers")
        .insert({
          user_id: authData.user.id,
          store_name: formData.store_name,
          store_description: formData.store_description,
          business_address: formData.business_address,
          contact_phone: formData.contact_phone || formData.phone,
          contact_email: formData.contact_email || formData.email,
          vendor_type: formData.vendor_type,
          commission_rate: formData.commission_rate,
          is_verified: true, // Admin-created vendors are auto-verified
          verification_status: "approved",
        })

      if (sellerError) throw sellerError

      toast({
        title: "Success",
        description: "Vendor created successfully",
      })

      router.push("/admin/vendors")
    } catch (error: any) {
      console.error("Error creating vendor:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create vendor",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/admin/vendors" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-8">
          <ArrowLeft size={20} />
          Back to Vendors
        </Link>

        <h1 className="text-4xl font-bold text-foreground mb-8">Create New Vendor</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">First Name *</label>
                  <Input
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    placeholder="John"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Last Name *</label>
                  <Input
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Email *</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john.doe@example.com"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Phone</label>
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+27 12 345 6789"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Password *</label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Minimum 6 characters"
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Business Information */}
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Store Name *</label>
                <Input
                  value={formData.store_name}
                  onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                  placeholder="ABC Electronics"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Store Description</label>
                <Textarea
                  value={formData.store_description}
                  onChange={(e) => setFormData({ ...formData, store_description: e.target.value })}
                  placeholder="Brief description of your store"
                  rows={3}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Business Address *</label>
                <Textarea
                  value={formData.business_address}
                  onChange={(e) => setFormData({ ...formData, business_address: e.target.value })}
                  placeholder="Full business address for product pickup"
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Contact Phone</label>
                  <Input
                    type="tel"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    placeholder="+27 12 345 6789"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Contact Email</label>
                  <Input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    placeholder="contact@store.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Vendor Type</label>
                  <Select
                    value={formData.vendor_type}
                    onValueChange={(value) => setFormData({ ...formData, vendor_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="freelance_reseller">Freelance Reseller</SelectItem>
                      <SelectItem value="startup_reseller">Startup Reseller</SelectItem>
                      <SelectItem value="established_reseller">Established Reseller</SelectItem>
                      <SelectItem value="enterprise_reseller">Enterprise Reseller</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Commission Rate (%)</label>
                  <Input
                    type="number"
                    min="0"
                    max="50"
                    value={formData.commission_rate}
                    onChange={(e) => setFormData({ ...formData, commission_rate: Number.parseFloat(e.target.value) || 15 })}
                    placeholder="15"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Vendor"}
            </Button>
            <Link href="/admin/vendors">
              <Button variant="outline">Cancel</Button>
            </Link>
          </div>
        </form>
      </div>
    </main>
  )
}
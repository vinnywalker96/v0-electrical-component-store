"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Upload, User } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ImageUploadField } from "@/components/image-upload-field"

export default function SellerSettingsPage() {
  const supabase = createClient()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [seller, setSeller] = useState<any>(null)
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  useEffect(() => {
    fetchSellerProfile()
  }, [])

  async function fetchSellerProfile() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: sellerData } = await supabase.from("sellers").select("*").eq("user_id", user.id).single()
      setSeller(sellerData)
    } catch (error) {
      console.error("[v0] Error fetching seller profile:", error)
    }
  }

  async function handleProfileImageUpload(imageUrl: string) {
    if (!seller) return

    try {
      const { error } = await supabase
        .from("sellers")
        .update({ profile_image_url: imageUrl })
        .eq("id", seller.id)

      if (error) throw error

      setSeller({ ...seller, profile_image_url: imageUrl })
      toast({
        title: "Success",
        description: "Profile image updated successfully",
      })
    } catch (error: any) {
      console.error("[v0] Profile image update error:", error)
      toast({
        title: "Error",
        description: "Failed to update profile image",
        variant: "destructive",
      })
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()

    if (passwords.newPassword !== passwords.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords don't match",
        variant: "destructive",
      })
      return
    }

    if (passwords.newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.newPassword,
      })

      if (error) throw error

      toast({
        title: "Success",
        description: "Password updated successfully",
      })

      setPasswords({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
    } catch (error: any) {
      console.error("[v0] Password change error:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update password",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link href="/seller/dashboard" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-8">
          <ArrowLeft size={20} />
          Back to Dashboard
        </Link>

        <h1 className="text-4xl font-bold text-foreground mb-8">Settings</h1>

        {/* Profile Image Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Profile Image</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
                {seller?.profile_image_url ? (
                  <img
                    src={seller.profile_image_url}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-8 h-8 text-slate-400" />
                )}
              </div>
              <div className="flex-1">
                <ImageUploadField
                  onUploadComplete={(result) => handleProfileImageUpload(result.url)}
                  currentImageUrl={seller?.profile_image_url}
                  bucket="profiles"
                  folder={`seller-${seller?.id}`}
                  accept="image/*"
                >
                  <Button variant="outline" size="sm">
                    <Upload className="w-4 h-4 mr-2" />
                    {seller?.profile_image_url ? "Change Image" : "Upload Image"}
                  </Button>
                </ImageUploadField>
                <p className="text-sm text-slate-600 mt-2">
                  Upload a profile image for your seller account. Max size: 5MB.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Change Password Section */}
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Current Password</label>
                <Input
                  type="password"
                  value={passwords.currentPassword}
                  onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">New Password</label>
                <Input
                  type="password"
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Confirm New Password</label>
                <Input
                  type="password"
                  value={passwords.confirmPassword}
                  onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>

              <Button type="submit" disabled={loading}>
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <strong>Store Name:</strong> {seller?.store_name}
              </div>
              <div>
                <strong>Account Tier:</strong> {seller?.account_tier || "Basic"}
              </div>
              <div>
                <strong>Verification Status:</strong>{" "}
                <span className={`capitalize ${seller?.is_verified ? "text-green-600" : "text-orange-600"}`}>
                  {seller?.verification_status || "Pending"}
                </span>
              </div>
              <div>
                <strong>Commission Rate:</strong> {seller?.commission_rate || 15}%
              </div>
            </div>
            <p className="mt-4">
              To update your store information or banking details, please contact support.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, User } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ImageUploadField } from "@/components/image-upload-field"
import { useLanguage } from "@/lib/context/language-context"

export default function SellerSettingsPage() {
  const supabase = createClient()
  const { toast } = useToast()
  const { t } = useLanguage()
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
        title: t("common.success"),
        description: t("seller_settings.profile_image_success"),
      })
    } catch (error: any) {
      console.error("[v0] Profile image update error:", error)
      toast({
        title: t("common.error"),
        description: t("seller_settings.profile_image_error"),
        variant: "destructive",
      })
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()

    if (passwords.newPassword !== passwords.confirmPassword) {
      toast({
        title: t("common.error"),
        description: t("seller_settings.passwords_dont_match"),
        variant: "destructive",
      })
      return
    }

    if (passwords.newPassword.length < 6) {
      toast({
        title: t("common.error"),
        description: t("seller_settings.password_min_length"),
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
        title: t("common.success"),
        description: t("seller_settings.password_success"),
      })

      setPasswords({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
    } catch (error: any) {
      console.error("[v0] Password change error:", error)
      toast({
        title: t("common.error"),
        description: error.message || t("seller_settings.password_error"),
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
          {t("seller_settings.back_to_dashboard")}
        </Link>

        <h1 className="text-4xl font-bold text-foreground mb-8">{t("seller_settings.title")}</h1>

        {/* Profile Image Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t("seller_settings.profile_image")}</CardTitle>
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
                  label={t("seller_settings.upload_image")}
                  onUploadComplete={(result) => handleProfileImageUpload(result.url)}
                  currentImageUrl={seller?.profile_image_url}
                  folder={`seller-${seller?.id}`}
                  accept="image/*"
                />
                <p className="text-sm text-slate-600 mt-2">
                  {t("seller_settings.upload_desc")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Change Password Section */}
        <Card>
          <CardHeader>
            <CardTitle>{t("seller_settings.change_password")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">{t("seller_settings.current_password")}</label>
                <Input
                  type="password"
                  value={passwords.currentPassword}
                  onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">{t("seller_settings.new_password")}</label>
                <Input
                  type="password"
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">{t("seller_settings.confirm_password")}</label>
                <Input
                  type="password"
                  value={passwords.confirmPassword}
                  onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>

              <Button type="submit" disabled={loading}>
                {loading ? t("seller_settings.updating") : t("seller_settings.update_password")}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{t("seller_settings.account_info")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <strong>{t("seller_settings.store_name")}:</strong> {seller?.store_name}
              </div>
              <div>
                <strong>{t("seller_settings.account_tier")}:</strong> {seller?.account_tier || "Basic"}
              </div>
              <div>
                <strong>{t("seller_settings.verification_status")}:</strong>{" "}
                <span className={`capitalize ${seller?.is_verified ? "text-green-600" : "text-orange-600"}`}>
                  {seller?.verification_status || "Pending"}
                </span>
              </div>
              <div>
                <strong>{t("seller_settings.commission_rate")}:</strong> {seller?.commission_rate || 15}%
              </div>
            </div>
            <p className="mt-4">
              {t("seller_settings.contact_support")}
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

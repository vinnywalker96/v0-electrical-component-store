"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import { createClient } from "@/lib/supabase/client"
import { ImageUploadField } from "@/components/image-upload-field"
import type { UploadResult } from "@/lib/utils/file-upload"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

/* =======================
   Types
======================= */
type UserProfile = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  role: "user" | "admin" | "super_admin" | "vendor"
  account_tier: string | null
  monthly_fee: number | null
  profile_image_url: string | null
  account_tier_expires_at: string | null
  created_at: string
  updated_at: string
}

/* =======================
   Component
======================= */
export default function ProfilePage() {
  const supabase = createClient()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
  })

  /* =======================
     Fetch profile
  ======================= */
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) return

        const { data: profileData } = await supabase
          .from("profiles")
          .select(`
            id,
            email,
            first_name,
            last_name,
            phone,
            role,
            account_tier,
            profile_image_url,
            monthly_fee,
            account_tier_expires_at,
            created_at,
            updated_at
          `)
          .eq("id", user.id)
          .single()

        if (profileData) {
          setProfile(profileData)
          setFormData({
            firstName: profileData.first_name ?? "",
            lastName: profileData.last_name ?? "",
            phone: profileData.phone ?? "",
          })
          setProfileImageUrl(profileData.profile_image_url)
        }
      } catch (error) {
        console.error("Error fetching profile:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [supabase])

  /* =======================
     Image upload
  ======================= */
  function handleProfileImageUpload(result: UploadResult) {
    if (result.url) {
      setProfileImageUrl(result.url)
    }
  }

  /* =======================
     Save profile
  ======================= */
  async function handleSave() {
    try {
      setSaving(true)
      setSuccess(false)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error("User not authenticated")

      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
          profile_image_url: profileImageUrl,
          account_tier: profile?.account_tier ?? "basic",
          monthly_fee: profile?.monthly_fee ?? 0,
          account_tier_expires_at: profile?.account_tier_expires_at ?? null,
        })
        .eq("id", user.id)

      if (error) throw error

      // Re-fetch profile data after successful update
      const { data: updatedProfileData, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      if (fetchError) throw fetchError

      if (updatedProfileData) {
        setProfile(updatedProfileData)
        setFormData({
          firstName: updatedProfileData.first_name || "",
          lastName: updatedProfileData.last_name || "",
          phone: updatedProfileData.phone || "",
        })
        setProfileImageUrl(updatedProfileData.profile_image_url)
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (error) {
      console.error("Error saving profile:", error)
    } finally {
      setSaving(false)
    }
  }

  /* =======================
     Loading state
  ======================= */
  if (loading) {
    return <div className="text-center py-12">Loading profile...</div>
  }

  /* =======================
     UI
  ======================= */
  return (
    <>
      <h1 className="text-4xl font-bold mb-8">My Profile</h1>

      {/* Personal Info */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              Profile updated successfully!
            </div>
          )}

          <ImageUploadField
            label="Profile Picture"
            bucket="profiles"
            currentImageUrl={profileImageUrl ?? undefined}
            onUploadComplete={handleProfileImageUpload}
            onRemove={() => setProfileImageUrl(null)}
          />

          {/* Names */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                First Name
              </label>
              <Input
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                placeholder="John"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Last Name
              </label>
              <Input
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
                placeholder="Doe"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="text-sm font-medium mb-2 block">Email</label>
            <Input
              type="email"
              value={profile?.email ?? ""}
              disabled
              className="bg-slate-100"
            />
            <p className="text-xs text-slate-600 mt-1">
              Email cannot be changed
            </p>
          </div>

          {/* Phone */}
          <div>
            <label className="text-sm font-medium mb-2 block">Phone</label>
            <Input
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              placeholder="+1 (555) 000-0000"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
            <Link href="/protected/dashboard">
              <Button variant="outline">Cancel</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-slate-600">Member Since</p>
            <p className="font-semibold">
              {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString()
                : "N/A"}
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-600">Account Type</p>
            <p className="font-semibold capitalize">
              {profile?.role ?? "Customer"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Dashboards */}
      {(profile?.role === "admin" ||
        profile?.role === "super_admin" ||
        profile?.role === "vendor") && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Dashboards</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(profile.role === "admin" ||
              profile.role === "super_admin") && (
              <Link href="/admin/dashboard">
                <Button variant="outline">Admin Dashboard</Button>
              </Link>
            )}

            {profile.role === "vendor" && (
              <Link href="/seller/dashboard">
                <Button variant="outline">Vendor Dashboard</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </>
  )
}

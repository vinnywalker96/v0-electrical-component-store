"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import type { UserProfile } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import { ImageUploadField } from "@/components/image-upload-field"
import type { UploadResult } from "@/lib/utils/file-upload"

export default function ProfilePage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
  })

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (user) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single()

          if (profileData) {
            setProfile(profileData)
            setFormData({
              firstName: profileData.first_name || "",
              lastName: profileData.last_name || "",
              phone: profileData.phone || "",
            })
            setAvatarUrl(profileData.avatar_url)
          }
        }
      } catch (error) {
        console.error("[v0] Error fetching profile:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [supabase, setFormData, setAvatarUrl, setProfile])

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
          avatar_url: avatarUrl,
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
        setAvatarUrl(updatedProfileData.avatar_url)
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (error) {
      console.error("[v0] Error saving profile:", JSON.stringify(error, null, 2))
    } finally {
      setSaving(false)
    }
  }

  function handleAvatarUpload(result: UploadResult) {
    if (result.url) {
      setAvatarUrl(result.url)
    }
  }

  if (loading) {
    return <div className="text-center py-12">Loading profile...</div>
  }

  return (
    <>
        <h1 className="text-4xl font-bold text-foreground mb-8">My Profile</h1>

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
              currentImageUrl={avatarUrl || undefined}
              onUploadComplete={handleAvatarUpload}
              onRemove={() => setAvatarUrl(null)}
            />

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Email
              </label>
              <Input
                type="email"
                value={profile?.email || ""}
                disabled
                className="bg-slate-100"
              />
              <p className="text-xs text-slate-600 mt-1">
                Email cannot be changed
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  First Name
                </label>
                <Input
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  placeholder="First name"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Last Name
                </label>
                <Input
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  placeholder="Last name"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Phone
              </label>
              <Input
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="+1 (555) 000-0000"
              />
            </div>

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
                {profile?.role || "Customer"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Dashboards */}
        {(profile?.role === "admin" || profile?.role === "super_admin" || profile?.role === "vendor") && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Dashboards</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(profile?.role === "admin" || profile?.role === "super_admin") && (
                <div>
                  <Link href="/admin/dashboard">
                    <Button variant="outline">Admin Dashboard</Button>
                  </Link>
                </div>
              )}
              {profile?.role === "vendor" && (
                <div>
                  <Link href="/seller/dashboard">
                    <Button variant="outline">Vendor Dashboard</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        )}
    </>
  )
}

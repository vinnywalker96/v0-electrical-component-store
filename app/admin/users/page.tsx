"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import type { UserProfile } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function AdminUsersPage() {
  const supabase = createClient()
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      setCurrentUserId(user?.id || null);

      const { data: profileData, error: profileError } = await supabase.from("profiles").select("role").eq("id", user?.id).single();
      if (profileError) throw profileError;
      setCurrentUserRole(profileData?.role || null);


      const response = await fetch("/api/admin/users")
      const data: UserProfile[] | { error: string } = await response.json()

      if (!response.ok) {
        throw new Error((data as { error: string }).error || "Failed to fetch users")
      }

      setProfiles(data as UserProfile[])
    } catch (err: any) {
      console.error("[v0] Error fetching users:", err)
      setError(err.message || "Failed to fetch users")
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  async function handleRoleChange(userId: string, newRole: string) {
    if (userId === currentUserId) {
      alert("You cannot change your own role.")
      return
    }
    if (newRole === "super_admin" && currentUserRole !== "super_admin") {
      alert("Only a Super Admin can assign the Super Admin role.")
      return
    }

    try {
      const response = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, newRole }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update role")
      }

      setProfiles((prevProfiles) =>
        prevProfiles.map((p) => (p.id === userId ? { ...p, role: newRole } : p))
      )
    } catch (err: any) {
      console.error("[v0] Error updating role:", err)
      setError(err.message || "Failed to update role")
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-xl text-foreground">Loading users...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Link href="/admin/dashboard" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-8">
          <ArrowLeft size={20} />
          Back to Admin Dashboard
        </Link>

        <h1 className="text-4xl font-bold text-foreground mb-8">Manage Users</h1>

        <Card>
          <CardContent className="pt-6">
            {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

            {profiles.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-600 mb-4">No users found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold">Name</th>
                      <th className="text-left py-3 px-4 font-semibold">Email</th>
                      <th className="text-left py-3 px-4 font-semibold">Role</th>
                      <th className="text-center py-3 px-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profiles.map((profile) => (
                      <tr key={profile.id} className="border-b hover:bg-slate-50">
                        <td className="py-3 px-4 font-semibold">
                          {profile.name}
                        </td>
                        <td className="py-3 px-4">{profile.email}</td>
                        <td className="py-3 px-4">
                          <Select
                            value={profile.role}
                            onValueChange={(newRole) => handleRoleChange(profile.id, newRole)}
                            disabled={profile.id === currentUserId || (profile.role === "super_admin" && currentUserRole !== "super_admin")}
                          >
                            <SelectTrigger className="w-[150px]">
                              <SelectValue placeholder="Select Role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="customer">Customer</SelectItem>
                              <SelectItem value="vendor">Vendor</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                              {currentUserRole === "super_admin" && (
                                <SelectItem value="super_admin">Super Admin</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {/* Add other user actions here if needed */}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

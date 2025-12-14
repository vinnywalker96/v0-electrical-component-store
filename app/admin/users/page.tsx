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
import { useSelector, useDispatch } from 'react-redux';
import { fetchAdminUsers, updateAdminUserRole, selectAdminUsers, selectAdminUsersLoading, selectAdminUsersError } from '@/lib/store/adminUsersSlice';

export default function AdminUsersPage() {
  const supabase = createClient()
  const dispatch = useDispatch();
  const users = useSelector(selectAdminUsers);
  const loading = useSelector(selectAdminUsersLoading);
  const error = useSelector(selectAdminUsersError);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)

  // This part still uses local state for current user's info
  const checkCurrentUser = useCallback(async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      setCurrentUserId(user?.id || null);

      const { data: profileData, error: profileError } = await supabase.from("profiles").select("role").eq("id", user?.id).single();
      if (profileError) throw profileError;
      setCurrentUserRole(profileData?.role || null);
    } catch (err) {
      console.error("Error fetching current user info:", err);
    }
  }, [supabase]);

  useEffect(() => {
    checkCurrentUser();
    dispatch(fetchAdminUsers() as any); // Fetch users from Redux thunk
  }, [dispatch, checkCurrentUser]);

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
      await dispatch(updateAdminUserRole({ userId, newRole }) as any);
    } catch (err: any) {
      alert(err.message || "Failed to update role"); // Display error to user
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

            {users.length === 0 ? (
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
                    {users.map((user) => (
                      <tr key={user.id} className="border-b hover:bg-slate-50">
                        <td className="py-3 px-4 font-semibold">
                          {user.first_name} {user.last_name}
                        </td>
                        <td className="py-3 px-4">{user.email}</td>
                        <td className="py-3 px-4">
                          <Select
                            value={user.role}
                            onValueChange={(newRole) => handleRoleChange(user.id, newRole)}
                            disabled={user.id === currentUserId || (user.role === "super_admin" && currentUserRole !== "super_admin")}
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

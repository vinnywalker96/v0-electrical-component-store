"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"
import { ArrowLeft } from "lucide-react"

interface UserProfile {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  role: string
  created_at: string
  // Add other profile fields you want to display
}

interface UserData extends UserProfile {
  // email and created_at are now directly on UserProfile, no need for auth_users nesting
}

export default function AdminUsersPage() {
  const supabase = createClient()
  const router = useRouter()
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchUsers() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login")
        return
      }
      setCurrentUserId(user.id)

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
      setCurrentUserRole(profile?.role || null)

      try {
        const response = await fetch("/api/admin/users")
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to fetch users")
        }
        const data: UserData[] = await response.json()
        setUsers(data)
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Could not load users.",
          variant: "destructive",
        })
        console.error("Failed to fetch users:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchUsers()
  }, [supabase, router])

  async function handleRoleChange(userId: string, newRole: string) {
    // Optimistically update UI
    setUsers((prevUsers) =>
      prevUsers.map((user) => (user.id === userId ? { ...user, role: newRole } : user))
    )

    try {
      const response = await fetch("/api/admin/users", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, newRole }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update role")
      }

      toast({
        title: "Success",
        description: "User role updated successfully.",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Could not update user role.",
        variant: "destructive",
      })
      console.error("Failed to update user role:", error)
      // Revert UI on error
      setUsers((prevUsers) =>
        prevUsers.map((user) => (user.id === userId ? { ...user, role: users.find(u => u.id === userId)?.role || user.role } : user))
      )
    }
  }

  if (loading) {
    return <div className="text-center py-12">Loading users...</div>
  }

  return (
    <main className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto py-8">
        <Link href="/admin/dashboard" className="mb-4 flex items-center text-primary hover:underline">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Link>
        <h1 className="text-4xl font-bold text-foreground mb-6">Manage Users</h1>

        <Card>
          <CardHeader>
            <CardTitle>All Registered Users</CardTitle>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <p className="text-slate-600">No users found.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Member Since</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>{`${user.first_name || ""} ${user.last_name || ""}`.trim() || "N/A"}</TableCell>
                        <TableCell>
                          <Select
                            value={user.role}
                            onValueChange={(newRole) => handleRoleChange(user.id, newRole)}
                            disabled={
                              currentUserRole !== "super_admin" || // Only super admins can change roles
                              user.id === currentUserId || // Cannot change your own role via this
                              user.role === "super_admin" && currentUserRole !== "super_admin" // Non-super-admin cannot touch super-admin
                            }
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Select Role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="customer">Customer</SelectItem>
                              <SelectItem value="vendor">Vendor</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                              {currentUserRole === "super_admin" && ( // Only super admin can assign super_admin role
                                <SelectItem value="super_admin">Super Admin</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/admin/users/${user.id}`}>View/Edit</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
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
import { ArrowLeft, Edit } from "lucide-react"
import { UserEditModal } from "@/components/user-edit-modal"
import { useLanguage } from "@/lib/context/language-context"

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
  const { t } = useLanguage()
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null)

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
          throw new Error(errorData.error || t("admin_users.update_error"))
        }
        const data: UserData[] = await response.json()
        setUsers(data)
      } catch (error: any) {
        toast({
          title: t("common.error"),
          description: error.message || t("admin_users.update_error"),
          variant: "destructive",
        })
        console.error("Failed to fetch users:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchUsers()
  }, [supabase, router, t])

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
        throw new Error(errorData.error || t("admin_users.update_error"))
      }

      toast({
        title: t("common.success"),
        description: t("admin_users.update_success"),
      })
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message || t("admin_users.update_error"),
        variant: "destructive",
      })
      console.error("Failed to update user role:", error)
      // Revert UI on error
      setUsers((prevUsers) =>
        prevUsers.map((user) => (user.id === userId ? { ...user, role: users.find(u => u.id === userId)?.role || user.role } : user))
      )
    }
  }

  async function handleSaveUser(updatedUser: UserProfile) {
    try {
      // Create a temporary client for this action to perform the update
      // This is necessary because handleRoleChange and update of other fields are separate calls and need separate privilege checks
      // For this modal, we assume the user is authenticated and has permissions, handled by the API route

      const response = await fetch("/api/admin/users", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: updatedUser.id,
          newRole: updatedUser.role,
          // Include other fields for profile update
          first_name: updatedUser.first_name,
          last_name: updatedUser.last_name,
          phone: updatedUser.phone,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || t("admin_users.update_error"))
      }

      // Update local state with all changes
      setUsers((prevUsers) =>
        prevUsers.map((user) => (user.id === updatedUser.id ? updatedUser : user))
      )

      toast({
        title: t("common.success"),
        description: t("admin_users.update_success"),
      })
      setIsModalOpen(false) // Close modal on success
      setEditingUser(null)
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message || t("admin_users.update_error"),
        variant: "destructive",
      })
      console.error("Failed to update user profile:", error)
      throw error // Re-throw to be caught by modal's handleSubmit
    }
  }

  const openEditModal = (user: UserProfile) => {
    setEditingUser(user)
    setIsModalOpen(true)
  }

  const closeEditModal = () => {
    setIsModalOpen(false)
    setEditingUser(null)
  }

  if (loading) {
    return <div className="text-center py-12">{t("admin_users.loading")}</div>
  }

  return (
    <main className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto py-8">
        <Link href="/admin/dashboard" className="mb-4 flex items-center text-primary hover:underline">
          <ArrowLeft className="w-4 h-4 mr-2" /> {t("admin_users.back_to_dashboard")}
        </Link>
        <h1 className="text-4xl font-bold text-foreground mb-6">{t("admin_users.title")}</h1>

        <Card>
          <CardHeader>
            <CardTitle>{t("admin_users.all_users")}</CardTitle>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <p className="text-slate-600">{t("admin_users.no_users")}</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("admin_users.email")}</TableHead>
                      <TableHead>{t("admin_users.name")}</TableHead>
                      <TableHead>{t("admin_users.role")}</TableHead>
                      <TableHead>{t("admin_users.member_since")}</TableHead>
                      <TableHead>{t("admin_users.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>{`${user.first_name || ""} ${user.last_name || ""}`.trim() || t("common.no_results")}</TableCell>
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
                              <SelectValue placeholder={t("admin_users.select_role")} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="customer">{t("admin_users.customer")}</SelectItem>
                              <SelectItem value="vendor">{t("admin_users.vendor")}</SelectItem>
                              <SelectItem value="admin">{t("admin_users.admin")}</SelectItem>
                              {currentUserRole === "super_admin" && ( // Only super admin can assign super_admin role
                                <SelectItem value="super_admin">{t("admin_users.super_admin")}</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" onClick={() => openEditModal(user)}>
                            <Edit className="w-4 h-4 mr-2" /> {t("admin_users.view_edit")}
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

      <UserEditModal
        user={editingUser}
        isOpen={isModalOpen}
        onClose={closeEditModal}
        onSave={handleSaveUser}
        currentUserRole={currentUserRole}
        currentUserId={currentUserId}
      />
    </main>
  )
}
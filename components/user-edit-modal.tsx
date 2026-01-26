"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"

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

interface UserEditModalProps {
  user: UserProfile | null
  isOpen: boolean
  onClose: () => void
  onSave: (updatedUser: UserProfile) => Promise<void>
  currentUserRole: string | null // Role of the currently logged-in admin/super_admin
  currentUserId: string | null // ID of the currently logged-in admin/super_admin
}

export function UserEditModal({
  user,
  isOpen,
  onClose,
  onSave,
  currentUserRole,
  currentUserId,
}: UserEditModalProps) {
  const [formData, setFormData] = useState<UserProfile | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (user) {
      setFormData(user)
    }
  }, [user])

  if (!user || !formData) {
    return null
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setFormData((prev) => (prev ? { ...prev, [id]: value } : null))
  }

  const handleRoleChange = (newRole: string) => {
    setFormData((prev) => (prev ? { ...prev, role: newRole } : null))
  }

  const handleSubmit = async () => {
    if (!formData) return

    setIsSaving(true)
    try {
      await onSave(formData)
      toast({
        title: "Success",
        description: "User profile updated successfully.",
      })
      onClose()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update user profile.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const isRoleChangeDisabled =
    currentUserRole !== "super_admin" || // Only super admins can change roles
    formData.id === currentUserId || // Cannot change your own role via this modal
    (formData.role === "super_admin" && currentUserRole !== "super_admin") // Non-super-admin cannot touch super-admin

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit User Profile</DialogTitle>
          <DialogDescription>
            Make changes to user&apos;s profile and role here. Click save when you&apos;re
            done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="id" className="text-right">
              ID
            </Label>
            <Input id="id" value={formData.id} disabled className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              Email
            </Label>
            <Input id="email" value={formData.email} disabled className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="first_name" className="text-right">
              First Name
            </Label>
            <Input
              id="first_name"
              value={formData.first_name || ""}
              onChange={handleInputChange}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="last_name" className="text-right">
              Last Name
            </Label>
            <Input
              id="last_name"
              value={formData.last_name || ""}
              onChange={handleInputChange}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="phone" className="text-right">
              Phone
            </Label>
            <Input
              id="phone"
              value={formData.phone || ""}
              onChange={handleInputChange}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="role" className="text-right">
              Role
            </Label>
            <Select
              value={formData.role}
              onValueChange={handleRoleChange}
              disabled={isRoleChangeDisabled}
            >
              <SelectTrigger className="col-span-3">
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
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="created_at" className="text-right">
              Member Since
            </Label>
            <Input
              id="created_at"
              value={new Date(formData.created_at).toLocaleDateString()}
              disabled
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

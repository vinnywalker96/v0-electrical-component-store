"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { format } from "date-fns"
import { ArrowLeft } from "lucide-react"

interface UserProfile {
  id: string
  email: string
  first_name: string
  last_name: string
  role: string
  account_status: "pending" | "approved" | "rejected"
  role_requested: string
  created_at: string
}

export default function PendingUsersPage() {
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchPendingUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/users?status=pending")
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch pending users")
      }
      const data: UserProfile[] = await response.json()
      setPendingUsers(data)
    } catch (err: any) {
      setError(err.message)
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchPendingUsers()
  }, [fetchPendingUsers])

  const handleAction = async (userId: string, action: "approve" | "reject") => {
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: userId, action }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to ${action} user`)
      }

      toast({
        title: "Success",
        description: `User ${action}ed successfully.`,
      })
      fetchPendingUsers() // Refresh the list
    } catch (err: any) {
      setError(err.message)
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-foreground">Loading pending users...</div>
  }

  if (error) {
    return <div className="text-center py-12 text-destructive">Error: {error}</div>
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/admin/dashboard" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-8">
          <ArrowLeft size={20} />
          Back to Admin Dashboard
        </Link>

        <h1 className="text-4xl font-bold text-foreground mb-8">Pending User Accounts</h1>

        {pendingUsers.length === 0 ? (
          <p className="text-foreground">No pending user accounts found.</p>
        ) : (
          <div className="grid gap-6">
            {pendingUsers.map((user) => (
              <Card key={user.id}>
                <CardHeader>
                  <CardTitle>{user.email}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p>
                    <span className="font-semibold">Name:</span> {user.first_name} {user.last_name}
                  </p>
                  <p>
                    <span className="font-semibold">Requested Role:</span> {user.role_requested}
                  </p>
                  <p>
                    <span className="font-semibold">Member Since:</span>{" "}
                    {format(new Date(user.created_at), "PPP")}
                  </p>
                  <div className="flex gap-4 mt-4">
                    <Button onClick={() => handleAction(user.id, "approve")} className="bg-green-600 hover:bg-green-700">
                      Approve
                    </Button>
                    <Button onClick={() => handleAction(user.id, "reject")} variant="destructive">
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

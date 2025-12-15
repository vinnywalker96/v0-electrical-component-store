"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createClient } from "@/lib/supabase/client"
import { loginSchema, type LoginInput } from "@/lib/schemas/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AdminLoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginInput) {
    setError(null)
    setLoading(true)

    try {
      const { error: signInError, data: authData } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (signInError) throw signInError

      // Verify user is admin or super_admin
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", authData.user.id).single()

      if (profile?.role !== "admin" && profile?.role !== "super_admin") {
        setError("Access denied. Insufficient permissions.")
        await supabase.auth.signOut()
        return
      }

      router.push("/admin/dashboard")
    } catch (err: any) {
      console.error("[v0] Admin login error:", err)
      setError(err.message || "Failed to sign in")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">System Admin Login</CardTitle>
          <p className="text-center text-sm text-slate-600">Access system administration panel</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>}

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Email</label>
              <Input {...register("email")} type="email" placeholder="admin@kg-components.com" disabled={loading} />
              {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Password</label>
              <Input {...register("password")} type="password" placeholder="••••••••" disabled={loading} />
              {errors.password && <p className="text-red-600 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Signing in..." : "Sign In as Admin"}
            </Button>
          </form>

          <Link href="/" className="block text-center mt-6 text-sm text-blue-600 hover:text-blue-700">
            Back to Home
          </Link>
        </CardContent>
      </Card>
    </main>
  )
}

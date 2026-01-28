"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useLanguage } from "@/lib/context/language-context"

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const { t } = useLanguage()
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) throw signInError

      router.push("/protected/dashboard")
    } catch (err: any) {
      setError(err.message || "Failed to sign in")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">{t("auth.login")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>}

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">{t("auth.email")}</label>
              <Input
                type="email"
                placeholder={t("footer.email_placeholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">{t("auth.password")}</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? t("auth.signing_in") : t("auth.login")}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <p className="text-slate-600">
              {t("auth.dontHaveAccount")}{" "}
              <Link href="/auth/signup" className="text-blue-600 hover:text-blue-700 font-semibold">
                {t("auth.sign_up_link")}
              </Link>
            </p>
          </div>

          <Link href="/" className="block text-center mt-4 text-sm text-blue-600 hover:text-blue-700">
            {t("auth.back_to_home")}
          </Link>
        </CardContent>
      </Card>
    </main>
  )
}

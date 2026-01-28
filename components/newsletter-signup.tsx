"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useLanguage } from "@/lib/context/language-context"

export function NewsletterSignup() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const { t } = useLanguage()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(t("footer.thanks"))
        setEmail("")
        setTimeout(() => setMessage(""), 3000)
      } else {
        setMessage(data.error || t("footer.failed"))
      }
    } catch (error) {
      console.error("[v0] Subscribe error:", error)
      setMessage(t("footer.error"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        type="email"
        placeholder={t("footer.email_placeholder")}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={loading}
        className="flex-1"
      />
      <Button type="submit" disabled={loading}>
        {loading ? t("footer.subscribing") : t("footer.subscribe")}
      </Button>
      {message && <div className="text-sm text-slate-600 whitespace-nowrap">{message}</div>}
    </form>
  )
}

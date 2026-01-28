"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useLanguage } from "@/lib/context/language-context"

export default function BankingDetailsPage() {
  const router = useRouter()
  const supabase = createClient()
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [formData, setFormData] = useState({
    account_holder: "",
    bank_name: "",
    account_number: "",
    branch_code: "",
    swift_code: "",
    reference_note: "",
  })

  const fetchBankingDetails = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/banking-details")

      if (!response.ok) {
        if (response.status === 403) {
          router.push("/admin/dashboard")
        }
        throw new Error(t("admin_banking.error"))
      }

      const { banking_details } = await response.json()

      if (banking_details && banking_details.length > 0) {
        const details = banking_details[0]
        setFormData({
          account_holder: details.account_holder || "",
          bank_name: details.bank_name || "",
          account_number: details.account_number || "",
          branch_code: details.branch_code || "",
          swift_code: details.swift_code || "",
          reference_note: details.reference_note || "",
        })
      }
    } catch (err: any) {
      console.error("Error:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [router, t])

  useEffect(() => {
    fetchBankingDetails()
  }, [fetchBankingDetails])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSuccess("")
    setSaving(true)

    try {
      const response = await fetch("/api/admin/banking-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t("admin_banking.error"))
      }

      setSuccess(t("admin_banking.success"))
      setTimeout(() => setSuccess(""), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12">{t("admin_banking.loading")}</div>
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-foreground mb-8">{t("admin_banking.title")}</h1>

        <Card>
          <CardHeader>
            <CardTitle>{t("admin_banking.configure")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>}
              {success && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">{success}</div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">{t("admin_banking.account_holder")}</label>
                  <Input
                    placeholder="e.g., KG Compponents Ltd"
                    value={formData.account_holder}
                    onChange={(e) => setFormData({ ...formData, account_holder: e.target.value })}
                    required
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">{t("admin_banking.bank_name")}</label>
                  <Input
                    placeholder="e.g., First National Bank"
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    required
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">{t("admin_banking.account_number")}</label>
                  <Input
                    placeholder="e.g., 123456789"
                    value={formData.account_number}
                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                    required
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">{t("admin_banking.branch_code")}</label>
                  <Input
                    placeholder="e.g., 250655"
                    value={formData.branch_code}
                    onChange={(e) => setFormData({ ...formData, branch_code: e.target.value })}
                    disabled={saving}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">{t("admin_banking.swift_code")}</label>
                <Input
                  placeholder="e.g., FIRNZAJJ"
                  value={formData.swift_code}
                  onChange={(e) => setFormData({ ...formData, swift_code: e.target.value })}
                  disabled={saving}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">{t("admin_banking.reference_note")}</label>
                <Textarea
                  placeholder="e.g., Please include your order number as reference"
                  value={formData.reference_note}
                  onChange={(e) => setFormData({ ...formData, reference_note: e.target.value })}
                  disabled={saving}
                />
              </div>

              <Button type="submit" disabled={saving} className="w-full">
                {saving ? t("admin_banking.saving") : t("admin_banking.save")}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{t("admin_banking.info_title")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 space-y-2">
            <p>
              {t("admin_banking.info_desc")}
            </p>
            <p>{t("admin_banking.admin_only")}</p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CurrencySwitcher } from "@/components/currency-switcher"
import { useLanguage } from "@/lib/context/language-context"

export default function AdminSettingsPage() {
  const { t } = useLanguage()

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("admin_dashboard.currency_settings")}</CardTitle>
          <CardDescription>{t("admin_dashboard.currency_description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <CurrencySwitcher />
        </CardContent>
      </Card>
    </div>
  )
}

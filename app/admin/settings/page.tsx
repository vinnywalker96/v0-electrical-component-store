"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CurrencySwitcher } from "@/components/currency-switcher"

export default function AdminSettingsPage() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Currency Settings</CardTitle>
          <CardDescription>Select the currency for the store.</CardDescription>
        </CardHeader>
        <CardContent>
          <CurrencySwitcher />
        </CardContent>
      </Card>
    </div>
  )
}

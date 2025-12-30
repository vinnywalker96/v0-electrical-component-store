// components/currency-switcher.tsx

"use client"

import { useCurrency } from "@/lib/context/currency-context"
import { DollarSign } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function CurrencySwitcher() {
  const { currentCurrency, allCurrencies, setCurrency } = useCurrency()

  if (!currentCurrency) {
    return null
  }

  return (
    <Select value={currentCurrency.currency_code} onValueChange={setCurrency}>
      <SelectTrigger className="w-24 gap-2">
        <DollarSign className="w-4 h-4" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {allCurrencies.map((currency) => (
          <SelectItem key={currency.currency_code} value={currency.currency_code}>
            {currency.currency_code}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
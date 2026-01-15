// lib/context/currency-context.tsx

"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"

interface Currency {
  currency_code: string
  currency_name: string
  symbol: string
  exchange_rate_to_zar: number
}

interface CurrencyContextType {
  currentCurrency: Currency | null
  allCurrencies: Currency[]
  setCurrency: (code: string) => void
  convertPrice: (priceInZAR: number) => number
  formatPrice: (priceInZAR: number) => string
  loading: boolean
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

export const CurrencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const supabase = createClient()
  const [currentCurrency, setCurrentCurrency] = useState<Currency | null>(null)
  const [allCurrencies, setAllCurrencies] = useState<Currency[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCurrencies = async () => {
      try {
        const { data, error } = await supabase.from("currency_rates").select("*").eq("is_active", true)
        if (error) {
          // Fallback to default ZAR currency
          const defaultCurrency = {
            currency_code: "ZAR",
            currency_name: "South African Rand",
            symbol: "R",
            exchange_rate_to_zar: 1
          }
          setAllCurrencies([defaultCurrency])
          setCurrentCurrency(defaultCurrency)
          localStorage.setItem("selectedCurrency", "ZAR")
          setLoading(false)
          return
        }
        if (!data || data.length === 0) {
          console.warn("No currencies found, using default ZAR")
          const defaultCurrency = {
            currency_code: "ZAR",
            currency_name: "South African Rand",
            symbol: "R",
            exchange_rate_to_zar: 1
          }
          setAllCurrencies([defaultCurrency])
          setCurrentCurrency(defaultCurrency)
          localStorage.setItem("selectedCurrency", "ZAR")
          setLoading(false)
          return
        }
        setAllCurrencies(data)

        const savedCurrencyCode = localStorage.getItem("selectedCurrency")
        const defaultCurrency = data.find((c) => c.currency_code === "ZAR") || data[0]

        if (savedCurrencyCode) {
          const found = data.find((c) => c.currency_code === savedCurrencyCode)
          setCurrentCurrency(found || defaultCurrency)
        } else {
          setCurrentCurrency(defaultCurrency)
          localStorage.setItem("selectedCurrency", defaultCurrency.currency_code)
        }
        setLoading(false)
      } catch (err) {
        console.error("Unexpected error fetching currencies:", err)
        // Fallback
        const defaultCurrency = {
          currency_code: "ZAR",
          currency_name: "South African Rand",
          symbol: "R",
          exchange_rate_to_zar: 1
        }
        setAllCurrencies([defaultCurrency])
        setCurrentCurrency(defaultCurrency)
        localStorage.setItem("selectedCurrency", "ZAR")
        setLoading(false)
      }
    }

    fetchCurrencies()
  }, [supabase])

  const setCurrency = (code: string) => {
    const newCurrency = allCurrencies.find((c) => c.currency_code === code)
    if (newCurrency) {
      setCurrentCurrency(newCurrency)
      localStorage.setItem("selectedCurrency", newCurrency.currency_code)
    }
  }

  const convertPrice = (priceInZAR: number): number => {
    if (!currentCurrency || currentCurrency.currency_code === "ZAR") {
      return priceInZAR
    }
    // Convert ZAR to current currency
    // price_in_current_currency = price_in_ZAR / exchange_rate_to_zar (of current currency)
    // Example: 1 USD = 18 ZAR. If price is 18 ZAR, convertPrice(18) = 1 USD.
    // So if currentCurrency is USD, currentCurrency.exchange_rate_to_zar is 18.
    // 18 / 18 = 1.
    return priceInZAR / currentCurrency.exchange_rate_to_zar
  }

  const formatPrice = (priceInZAR: number): string => {
    if (!currentCurrency) {
      return `R ${priceInZAR.toFixed(2)}`
    }
    const converted = convertPrice(priceInZAR)
    return `${currentCurrency.symbol} ${converted.toFixed(2)}`
  }

  return (
    <CurrencyContext.Provider value={{ currentCurrency, allCurrencies, setCurrency, convertPrice, formatPrice, loading }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export const useCurrency = (): CurrencyContextType => {
  const context = useContext(CurrencyContext)
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider")
  }
  return context
}

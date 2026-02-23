// lib/context/currency-context.tsx

"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from "react"
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

        // Fetch live exchange rates via proxy to avoid CSP issues
        let liveRates: Record<string, number> | null = null;
        try {
          const res = await fetch("/api/currency");
          if (res.ok) {
            const result = await res.json();
            liveRates = result.rates;
          }
        } catch (apiError) {
          console.error("Failed to fetch live exchange rates via proxy, falling back to database rates", apiError);
        }

        // Update database rows with live API exchange rates
        const updatedData = data.map(c => {
          if (c.currency_code === "ZAR") return c;
          if (liveRates && liveRates[c.currency_code]) {
            // The DB formula divides price by exchange_rate_to_zar. 
            // The API returns ZAR -> Currency multiplier.
            // So exchange_rate_to_zar is 1 / apiRate
            c.exchange_rate_to_zar = 1 / liveRates[c.currency_code];
          }
          return c;
        });

        setAllCurrencies(updatedData)

        const savedCurrencyCode = localStorage.getItem("selectedCurrency")
        const defaultCurrency = data.find((c) => c.currency_code === "ZAR") || updatedData[0]

        if (savedCurrencyCode) {
          const found = updatedData.find((c) => c.currency_code === savedCurrencyCode)
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

  const setCurrency = useCallback((code: string) => {
    const newCurrency = allCurrencies.find((c) => c.currency_code === code)
    if (newCurrency) {
      setCurrentCurrency(newCurrency)
      localStorage.setItem("selectedCurrency", newCurrency.currency_code)
    }
  }, [allCurrencies])

  const convertPrice = useCallback((priceInZAR: number): number => {
    if (!currentCurrency || currentCurrency.currency_code === "ZAR") {
      return priceInZAR
    }
    return priceInZAR / currentCurrency.exchange_rate_to_zar
  }, [currentCurrency])

  const formatPrice = useCallback((priceInZAR: number): string => {
    if (!currentCurrency) {
      return `R ${priceInZAR.toFixed(2)}`
    }
    const converted = convertPrice(priceInZAR)
    return `${currentCurrency.symbol} ${converted.toFixed(2)}`
  }, [currentCurrency, convertPrice])

  const contextValue = useMemo(() => ({
    currentCurrency, allCurrencies, setCurrency, convertPrice, formatPrice, loading
  }), [currentCurrency, allCurrencies, setCurrency, convertPrice, formatPrice, loading])

  return (
    <CurrencyContext.Provider value={contextValue}>
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

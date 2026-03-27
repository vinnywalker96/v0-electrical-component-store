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
  convertPrice: (price: number, baseCurrency?: string) => number
  formatPrice: (price: number, baseCurrency?: string) => string
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
        const allowedCurrencies = ["ZAR", "NAD", "MZN", "AOA"];
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
        const updatedData = data
          .filter(c => allowedCurrencies.includes(c.currency_code))
          .map(c => {
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

  const convertPrice = useCallback((price: number, baseCurrency: string = "ZAR"): number => {
    if (!currentCurrency) {
      return price
    }

    let priceInZAR = price;
    if (baseCurrency !== "ZAR") {
      const baseObj = allCurrencies.find(c => c.currency_code === baseCurrency);
      if (baseObj) {
        priceInZAR = price * baseObj.exchange_rate_to_zar;
      }
    }

    if (currentCurrency.currency_code === "ZAR") {
      return priceInZAR;
    }
    return priceInZAR / currentCurrency.exchange_rate_to_zar
  }, [currentCurrency, allCurrencies])

  const formatPrice = useCallback((price: number, baseCurrency: string = "ZAR"): string => {
    if (!currentCurrency) {
      if (baseCurrency === "ZAR") return `R ${(price || 0).toFixed(2)}`
      const baseObj = allCurrencies.find(c => c.currency_code === baseCurrency);
      return `${baseObj ? baseObj.symbol : baseCurrency} ${(price || 0).toFixed(2)}`;
    }
    const converted = convertPrice(price, baseCurrency)
    return `${currentCurrency.symbol} ${converted.toFixed(2)}`
  }, [currentCurrency, allCurrencies, convertPrice])

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

"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import type { CartItem, Product } from "@/lib/types"

interface CartContextType {
  items: (CartItem & { product?: Product })[]
  total: number
  tax: number
  itemCount: number
  addToCart: (productId: string, quantity: number) => Promise<void>
  removeFromCart: (cartItemId: string) => Promise<void>
  updateQuantity: (cartItemId: string, quantity: number) => Promise<void>
  clearCart: () => Promise<void>
  loading: boolean
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<(CartItem & { product?: Product })[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchCart = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setItems([])
        setLoading(false)
        return
      }

      const { data, error } = await supabase.from("cart_items").select("*, product:products(*, seller:sellers(*))").eq("user_id", user.id)

      if (error) throw error
      setItems(data || [])
    } catch (error) {
      console.error("[v0] Error fetching cart:", error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchCart()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      fetchCart()
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [fetchCart, supabase.auth])

  const addToCart = useCallback(async (productId: string, quantity: number) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("User not authenticated")

      const { error } = await supabase.from("cart_items").upsert(
        {
          user_id: user.id,
          product_id: productId,
          quantity,
        },
        { onConflict: "user_id,product_id" },
      )

      if (error) throw error
      await fetchCart()
    } catch (error) {
      console.error("[v0] Error adding to cart:", error)
      throw error
    }
  }, [supabase.auth, supabase.from, fetchCart])

  const removeFromCart = useCallback(async (cartItemId: string) => {
    try {
      const { error } = await supabase.from("cart_items").delete().eq("id", cartItemId)

      if (error) throw error
      await fetchCart()
    } catch (error) {
      console.error("[v0] Error removing from cart:", error)
      throw error
    }
  }, [supabase.from, fetchCart])

  const updateQuantity = useCallback(async (cartItemId: string, quantity: number) => {
    try {
      if (quantity <= 0) {
        await removeFromCart(cartItemId)
        return
      }

      const { error } = await supabase.from("cart_items").update({ quantity }).eq("id", cartItemId)

      if (error) throw error
      await fetchCart()
    } catch (error) {
      console.error("[v0] Error updating quantity:", error)
      throw error
    }
  }, [supabase.from, removeFromCart, fetchCart])

  const clearCart = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("User not authenticated")

      const { error } = await supabase.from("cart_items").delete().eq("user_id", user.id)

      if (error) throw error
      setItems([])
    } catch (error) {
      console.error("[v0] Error clearing cart:", error)
      throw error
    }
  }, [supabase.auth, supabase.from])

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0), [items])
  const tax = useMemo(() => Number.parseFloat((subtotal * 0.15).toFixed(2)), [subtotal]) // 15% tax
  const total = useMemo(() => Number.parseFloat((subtotal + tax).toFixed(2)), [subtotal, tax])

  const contextValue = useMemo(() => ({
    items,
    total,
    tax,
    itemCount: items.length,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    loading,
  }), [items, total, tax, addToCart, removeFromCart, updateQuantity, clearCart, loading])

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within CartProvider")
  }
  return context
}

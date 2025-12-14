"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useDispatch } from "react-redux"
import { addToCart } from "@/lib/store/cartSlice"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

interface AddToCartButtonProps {
  productId: string
  quantity?: number
  disabled?: boolean
  className?: string
}

export function AddToCartButton({ productId, quantity = 1, disabled = false, className }: AddToCartButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showMessage, setShowMessage] = useState(false)
  const dispatch = useDispatch()
  const router = useRouter()
  const supabase = createClient()

  async function handleAddToCart() {
    try {
      setIsLoading(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      dispatch(addToCart({ productId, quantity }) as any)

      setShowMessage(true)
      setTimeout(() => setShowMessage(false), 2000)
    } catch (error) {
      console.error("[v0] Add to cart error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative">
      <Button onClick={handleAddToCart} disabled={disabled || isLoading} className={className}>
        {isLoading ? "Adding..." : "Add to Cart"}
      </Button>
      {showMessage && (
        <div className="absolute top-12 left-0 bg-green-100 text-green-800 px-3 py-2 rounded text-sm whitespace-nowrap">
          Added to cart!
        </div>
      )}
    </div>
  )
}

"use client"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { useCart } from "@/lib/context/cart-context"
import { createClient } from "@/lib/supabase/client"
import { Store } from "lucide-react"
import type { Product } from "@/lib/types"

interface ProductCardProps {
  product: Product & { seller?: any }
}

export function ProductCard({ product }: ProductCardProps) {
  const [loading, setLoading] = useState(false)
  const [added, setAdded] = useState(false)
  const { addToCart } = useCart()
  const supabase = createClient()

  async function handleAddToCart() {
    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        window.location.href = "/auth/login"
        return
      }

      await addToCart(product.id, 1)
      setAdded(true)
      setTimeout(() => setAdded(false), 2000)
    } catch (error) {
      console.error("Error adding to cart:", error)
    } finally {
      setLoading(false)
    }
  }

  const displayPrice = product.price > 0 ? `R${product.price.toFixed(2)}` : "Coming Soon"
  const isPriceAvailable = product.price > 0

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <div className="w-full h-40 bg-gradient-to-br from-blue-50 to-slate-100 rounded-lg flex items-center justify-center mb-2">
          <div className="text-center">
            <div className="text-3xl text-blue-600 mb-1">
              {product.category === "Resistors"
                ? "⧉"
                : product.category === "LEDs"
                  ? "💡"
                  : product.category === "Capacitors"
                    ? "||"
                    : product.category === "Wires & Connectors"
                      ? "🔌"
                      : product.category === "Breadboards"
                        ? "📍"
                        : product.category === "Microcontrollers"
                          ? "🎮"
                          : "⚙"}
            </div>
            <p className="text-xs text-slate-500">{product.category}</p>
          </div>
        </div>

        {product.seller && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Store className="h-3 w-3" />
            <span>{product.seller.store_name}</span>
            {product.seller.rating && <span className="ml-1">⭐ {product.seller.rating.toFixed(1)}</span>}
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1">
        <h3 className="font-semibold text-sm line-clamp-2">{product.name}</h3>
        <p className="text-xs text-slate-600 mt-1 line-clamp-2">{product.description}</p>
        <p className="text-xs text-slate-500 mt-2">{product.brand}</p>
        <div className="flex justify-between items-center mt-3">
          <span
            className={`text-sm font-semibold px-2 py-1 rounded ${isPriceAvailable ? "text-primary bg-primary/10" : "text-orange-600 bg-orange-50"}`}
          >
            {displayPrice}
          </span>
          <span className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">
            {product.stock_quantity > 0 ? `${product.stock_quantity} in stock` : "Out of stock"}
          </span>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Link href={`/shop/${product.id}`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full text-xs bg-transparent">
            Details
          </Button>
        </Link>
        <Button
          size="sm"
          disabled={!isPriceAvailable || product.stock_quantity === 0 || loading}
          className="flex-1 text-xs"
          onClick={handleAddToCart}
        >
          {loading ? "Adding..." : added ? "Added!" : isPriceAvailable ? "Add to Cart" : "Coming Soon"}
        </Button>
      </CardFooter>
    </Card>
  )
}

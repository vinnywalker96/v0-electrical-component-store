"use client"

import { useEffect, useState } from "react"
import { ShoppingCart, AlertCircle } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import type { Product } from "@/lib/types"

export default function FeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchFeaturedProducts() {
      try {
        const supabase = createClient()

        const { data, error } = await supabase
          .from("products")
          .select("*")
          .gt("stock_quantity", 0)
          .order("created_at", { ascending: false })
          .limit(4)

        if (error) {
          if (error.message?.includes("relation") || error.code === "42P01") {
            setError("Database tables not set up yet. Please run the SQL migration scripts.")
          } else {
            setError(error.message || "Failed to load products")
          }
          return
        }

        setProducts(data || [])
      } catch (err) {
        console.error("Error fetching featured products:", err)
        setError("Unable to load products. Please ensure the database is configured.")
      } finally {
        setLoading(false)
      }
    }

    fetchFeaturedProducts()
  }, [])

  if (loading) {
    return (
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-muted-foreground">Loading products...</p>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Featured Products</h2>
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6 max-w-md mx-auto">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
            <p className="text-amber-800 dark:text-amber-200 font-medium">Products Coming Soon</p>
            <p className="text-amber-600 dark:text-amber-300 text-sm mt-2">
              Our product catalog is being set up. Check back shortly!
            </p>
          </div>
        </div>
      </section>
    )
  }

  if (products.length === 0) {
    return (
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Featured Products</h2>
          <p className="text-muted-foreground">No products available yet. Check back soon!</p>
        </div>
      </section>
    )
  }

  return (
    <section className="py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Featured Products</h2>
          <p className="text-muted-foreground text-lg">Check out our best-selling electrical components</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <Link key={product.id} href={`/shop/${product.id}`} className="group">
              <div className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg transition h-full flex flex-col">
                <div className="relative overflow-hidden bg-muted h-48 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl mb-2">
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
                    <p className="text-xs text-muted-foreground">{product.category}</p>
                  </div>
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <p className="text-sm text-accent font-semibold">{product.category}</p>
                  <h3 className="font-semibold text-foreground mb-2 line-clamp-2">{product.name}</h3>
                  <p className="text-xs text-muted-foreground mb-4 flex-1 line-clamp-2">{product.description}</p>
                  <div className="flex justify-between items-center mt-auto">
                    <span className="text-lg font-bold text-primary">
                      {product.price > 0 ? `R${product.price.toFixed(2)}` : "Price TBD"}
                    </span>
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                      }}
                      className="bg-primary hover:bg-primary-dark text-white p-2 rounded-lg transition"
                    >
                      <ShoppingCart className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link
            href="/shop"
            className="bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-8 rounded-lg transition inline-block"
          >
            View All Products
          </Link>
        </div>
      </div>
    </section>
  )
}

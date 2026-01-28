"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Minus, Plus, ShoppingCart, MessageSquare } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useCart } from "@/lib/context/cart-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { Product } from "@/lib/types"
import { useCurrency } from "@/lib/context/currency-context"
import { useLanguage } from "@/lib/context/language-context"

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [seller, setSeller] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const { addToCart } = useCart()
  const supabase = createClient()
  const { formatPrice } = useCurrency()
  const { t } = useLanguage()

  useEffect(() => {
    async function fetchProduct() {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*, seller:sellers(*)")
          .eq("id", params.id)
          .single()

        if (error) throw error
        setProduct(data)
        setSeller(data.seller)
      } catch (error) {
        console.error("Error fetching product:", error)
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchProduct()
    }
  }, [params.id, supabase, setProduct, setSeller])

  async function handleAddToCart() {
    if (!product) return

    setAdding(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      await addToCart(product.id, quantity)
      setAdded(true)
      setTimeout(() => setAdded(false), 2000)
    } catch (error) {
      console.error("Error adding to cart:", error)
    } finally {
      setAdding(false)
    }
  }

  async function handleContactSeller() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push("/auth/login")
      return
    }

    if (seller) {
      router.push(`/chat/${seller.user_id}?product=${product?.id}`)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">{t("product_detail.loading_product")}</p>
        </div>
      </main>
    )
  }

  if (!product) {
    return (
      <main className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">{t("product_detail.product_not_found")}</h1>
          <Link href="/shop" className="text-primary hover:underline">
            {t("product_detail.back_to_shop")}
          </Link>
        </div>
      </main>
    )
  }

  const displayPrice = product.price > 0 ? formatPrice(product.price) : t("product_detail.price_tbd")
  const canAddToCart = product.stock_quantity > 0 && product.price > 0

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Link href="/shop" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" />
          {t("product_detail.back_to_shop")}
        </Link>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Product Image */}
          <div className="relative bg-gradient-to-br from-blue-50 to-slate-100 rounded-lg h-96 flex items-center justify-center overflow-hidden">
            <Image
              src={product.image_url || "/placeholder.svg"}
              alt={product.name}
              fill
              className="object-contain"
            />
          </div>

          {/* Product Info */}
          <div>
            <p className="text-accent font-semibold mb-2">{product.category}</p>
            <h1 className="text-3xl font-bold text-foreground mb-4">{product.name}</h1>
            <p className="text-muted-foreground mb-6">{product.description}</p>

            {seller && (
              <Card className="mb-6">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-muted-foreground">{t("product_detail.sold_by")}</p>
                      <p className="font-semibold">{seller.store_name}</p>
                      <p className="text-xs text-muted-foreground">⭐ {seller.rating?.toFixed(1) || "New"}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleContactSeller}>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      {t("product_detail.contact_seller")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex items-center gap-4 mb-6">
              <span className="text-3xl font-bold text-primary">{displayPrice}</span>
              <span
                className={`px-3 py-1 rounded-full text-sm ${product.stock_quantity > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}
              >
                {product.stock_quantity > 0 ? t("product_detail.in_stock") : t("product_detail.out_of_stock")}
              </span>
            </div>

            {/* Specifications */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-4">{t("product_detail.specifications")}</h3>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-muted-foreground">{t("product_detail.brand")}</dt>
                    <dd className="font-medium">{product.brand}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t("product_detail.category")}</dt>
                    <dd className="font-medium">{product.category}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t("product_detail.sku")}</dt>
                    <dd className="font-medium">{product.sku || "N/A"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t("product_detail.stock")}</dt>
                    <dd className="font-medium">
                      {product.stock_quantity > 0 ? t("product_detail.in_stock") : t("product_detail.out_of_stock")}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            {/* Quantity and Add to Cart */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex items-center border border-border rounded-lg bg-slate-50 w-full sm:w-auto justify-between sm:justify-start">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-3 hover:bg-white rounded-l-lg transition shadow-sm disabled:opacity-50"
                  disabled={quantity <= 1 || !canAddToCart}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-6 py-2 font-bold text-lg min-w-[3rem] text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                  className="p-3 hover:bg-white rounded-r-lg transition shadow-sm"
                  disabled={quantity >= product.stock_quantity || !canAddToCart}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <Button onClick={handleAddToCart} disabled={!canAddToCart || adding} size="lg" className="w-full sm:flex-1 h-12 md:h-14 text-lg">
                <ShoppingCart className="w-5 h-5 mr-2" />
                {adding ? t("product_detail.adding") : added ? t("product_detail.added_to_cart") : t("product_detail.add_to_cart")}
              </Button>
            </div>

            {!canAddToCart && (
              <p className="text-sm text-muted-foreground mt-4">
                {product.stock_quantity === 0
                  ? t("product_detail.product_out_of_stock")
                  : t("product_detail.price_not_available")}
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

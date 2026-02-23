"use client"

import Link from "next/link"
import { useState, memo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { useCart } from "@/lib/context/cart-context"
import { createClient } from "@/lib/supabase/client"
import { Store } from "lucide-react"
import NextImage from "next/image"
import type { Product } from "@/lib/types"
import { useCurrency } from "@/lib/context/currency-context"
import { useLanguage } from "@/lib/context/language-context"
import { getTranslation, detectLanguage } from "@/lib/utils/translation"


interface ProductCardProps {
  product: Product & { seller?: any }
}

export function ProductCard({ product }: ProductCardProps) {
  const [loading, setLoading] = useState(false)
  const [added, setAdded] = useState(false)
  const [translatedName, setTranslatedName] = useState<string>("")
  const [translatedDesc, setTranslatedDesc] = useState<string>("")
  const { addToCart } = useCart()
  const supabase = createClient()
  const { formatPrice } = useCurrency()
  const { language, t } = useLanguage()

  // Auto-translate when translation is missing or language mismatch
  useEffect(() => {
    // Reset translations when language changes
    setTranslatedName("")
    setTranslatedDesc("")

    if (language === "pt") {
      // Check if name_pt is missing OR is identical to English OR name is detected as English
      const needsTranslation = !product.name_pt ||
        product.name_pt === product.name ||
        (product.name && detectLanguage(product.name) === 'en');

      if (needsTranslation && product.name) {
        getTranslation(product.name, "pt").then((result) => {
          if (result && result !== product.name) setTranslatedName(result)
        })
      }

      const needsDescTranslation = !product.description_pt ||
        product.description_pt === product.description ||
        (product.description && detectLanguage(product.description) === 'en');

      if (needsDescTranslation && product.description) {
        getTranslation(product.description, "pt").then((result) => {
          if (result && result !== product.description) setTranslatedDesc(result)
        })
      }
    } else if (language === "en") {
      // Check if name is missing OR identical to name_pt OR name_pt is detected as Portuguese
      const needsTranslation = !product.name ||
        product.name === product.name_pt ||
        (product.name_pt && detectLanguage(product.name_pt) === 'pt') ||
        (product.name && detectLanguage(product.name) === 'pt');

      if (needsTranslation && (product.name_pt || product.name)) {
        getTranslation(product.name_pt || product.name, "en").then((result) => {
          if (result && result !== (product.name_pt || product.name)) {
            setTranslatedName(result)
          }
        })
      }

      const needsDescTranslation = !product.description ||
        product.description === product.description_pt ||
        (product.description_pt && detectLanguage(product.description_pt) === 'pt') ||
        (product.description && detectLanguage(product.description) === 'pt');

      if (needsDescTranslation && (product.description_pt || product.description)) {
        getTranslation(product.description_pt || product.description, "en").then((result) => {
          if (result && result !== (product.description_pt || product.description)) {
            setTranslatedDesc(result)
          }
        })
      }
    }
  }, [language, product.name, product.name_pt, product.description, product.description_pt])

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

  const displayPrice = product.price > 0 ? formatPrice(product.price) : t("product_card.coming_soon")
  const isPriceAvailable = product.price > 0

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <div className="w-full h-40 bg-gradient-to-br from-blue-50 to-slate-100 rounded-lg flex items-center justify-center mb-2 overflow-hidden">
          {product.image_url ? (
            <NextImage
              src={product.image_url}
              alt={language === "pt"
                ? (translatedName || product.name_pt || product.name || "")
                : (translatedName || product.name || product.name_pt || "")}
              width={160}
              height={160}
              className="object-contain w-full h-full p-2"
              onError={(e) => {
                // Fallback to category icon if image fails to load
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="text-center">
              <div className="text-3xl text-blue-600 mb-1">
                {product.category === "Resistors"
                  ? "⧉"
                  : product.category === "Capacitors"
                    ? "||"
                    : product.category === "Potentiometers"
                      ? "⚙"
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
          )}
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
        <h3 className="font-semibold text-sm line-clamp-2">
          {language === "pt"
            ? (translatedName || product.name_pt || product.name)
            : (translatedName || product.name || product.name_pt)}
        </h3>
        <p className="text-xs text-slate-600 mt-1 line-clamp-2">
          {language === "pt"
            ? (translatedDesc || product.description_pt || product.description)
            : (translatedDesc || product.description || product.description_pt)}
        </p>
        <p className="text-xs text-slate-500 mt-2">{product.manufacturer}</p>
        <div className="flex justify-between items-center mt-3">
          <span
            className={`text-sm font-semibold px-2 py-1 rounded ${isPriceAvailable ? "text-primary bg-primary/10" : "text-orange-600 bg-orange-50"}`}
          >
            {displayPrice}
          </span>
          <span className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">
            {product.stock_quantity > 0 ? t("product_card.in_stock") : t("product_card.out_of_stock")}
          </span>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Link href={`/shop/${product.id}`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full text-xs bg-transparent">
            {t("product_card.details")}
          </Button>
        </Link>
        <Button
          size="sm"
          disabled={!isPriceAvailable || product.stock_quantity === 0 || loading}
          className="flex-1 text-xs"
          onClick={handleAddToCart}
        >
          {loading ? t("product_card.adding") : added ? t("product_card.added") : isPriceAvailable ? t("product_card.add_to_cart") : t("product_card.coming_soon")}
        </Button>
      </CardFooter>
    </Card>
  )
}

export default memo(ProductCard)

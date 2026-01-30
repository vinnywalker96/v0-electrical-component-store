"use client"

import Link from "next/link"
import { useCart } from "@/lib/context/cart-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trash2, ArrowLeft, Plus, Minus } from "lucide-react"
import { useLanguage } from "@/lib/context/language-context"

export default function CartPage() {
  const { items, total, tax, clearCart, removeFromCart, updateQuantity, loading } = useCart()
  const { language, t } = useLanguage()

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <p className="text-center text-slate-600">{t("cart.loading")}</p>
        </div>
      </main>
    )
  }

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Link href="/" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-8">
            <ArrowLeft size={20} />
            {t("cart.back_to_home")}
          </Link>

          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-2xl font-semibold text-slate-900 mb-2">{t("cart.empty_title")}</p>
              <p className="text-slate-600 mb-6">{t("cart.empty_desc")}</p>
              <Link href="/shop">
                <Button>{t("cart.continue_shopping")}</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  const subtotal = items.reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0)

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/shop" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-8">
          <ArrowLeft size={20} />
          {t("cart.continue_shopping")}
        </Link>

        <h1 className="text-4xl font-bold text-foreground mb-8">{t("cart.title")}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-4 md:p-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Product Basic Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate">
                        {language === "pt" && item.product?.name_pt ? item.product.name_pt : item.product?.name}
                      </h3>
                      <p className="text-sm text-slate-600 mt-1">
                        {item.product?.manufacturer} • {item.product?.category}
                      </p>
                      <p className="text-xl font-bold text-blue-600 mt-2">
                        {item.product?.price ? `$${item.product.price.toFixed(2)}` : "TBD"}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 sm:flex-nowrap">
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2 border rounded-lg px-2 py-1 bg-slate-50">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1.5 hover:bg-white rounded transition-colors shadow-sm disabled:opacity-50"
                          disabled={item.quantity <= 1}
                        >
                          <Minus size={16} />
                        </button>
                        <span className="w-8 text-center font-semibold text-sm">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-1.5 hover:bg-white rounded transition-colors shadow-sm"
                        >
                          <Plus size={16} />
                        </button>
                      </div>

                      {/* Item Total & Remove */}
                      <div className="flex items-center gap-4 ml-auto sm:ml-0">
                        <div className="text-right min-w-[80px]">
                          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-0.5">
                            {t("cart.item_subtotal")}
                          </p>
                          <p className="text-lg font-bold text-slate-900">
                            ${((item.product?.price || 0) * item.quantity).toFixed(2)}
                          </p>
                        </div>

                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="p-2.5 hover:bg-red-50 rounded-xl text-red-500 transition-colors"
                          aria-label="Remove item"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Order Summary */}
          <div>
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle>{t("cart.order_summary")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">{t("cart.items_count", { count: items.length.toString() })}</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">{t("cart.tax")}</span>
                  <span className="font-medium">${tax.toFixed(2)}</span>
                </div>

                <div className="border-t pt-4 flex justify-between">
                  <span className="font-semibold text-lg">{t("cart.total")}</span>
                  <span className="font-bold text-lg text-blue-600">${total.toFixed(2)}</span>
                </div>

                <Link href="/checkout" className="block">
                  <Button className="w-full" size="lg">
                    {t("cart.proceed_checkout")}
                  </Button>
                </Link>

                <Button variant="outline" className="w-full bg-transparent" onClick={() => clearCart()}>
                  {t("cart.clear_cart")}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  )
}

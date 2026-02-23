"use client"

import Link from "next/link"
import { ArrowRight, Zap, Package, Truck, Shield } from "lucide-react"
import FeaturedProducts from "@/components/featured-products"
import { useLanguage } from "@/lib/context/language-context"
import { useCurrency } from "@/lib/context/currency-context"

export default function Home() {
  const { t } = useLanguage()
  const { formatPrice } = useCurrency()

  const shippingThreshold = formatPrice(500)

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary to-primary-dark text-white py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">{t("home.hero_title")}</h1>
              <p className="text-lg text-white/90 mb-8">
                {t("home.hero_subtitle")}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/shop"
                  className="bg-accent hover:bg-accent-light text-white font-semibold py-3 px-8 rounded-lg flex items-center justify-center gap-2 transition w-full sm:w-auto"
                >
                  {t("home.shop_now")} <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/about"
                  className="bg-white/20 hover:bg-white/30 text-white font-semibold py-3 px-8 rounded-lg transition text-center w-full sm:w-auto"
                >
                  {t("home.learn_more")}
                </Link>
              </div>
            </div>
            <div className="bg-white/10 rounded-lg h-64 md:h-96 flex items-center justify-center backdrop-blur-sm">
              <div className="text-center">
                <Zap className="w-24 h-24 mx-auto mb-4 opacity-50" />
                <p className="text-white/70">{t("home.electrical_hub")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-16 px-4 bg-muted">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <Package className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">{t("home.features.selection_title")}</h3>
              <p className="text-muted-foreground">{t("home.features.selection_desc")}</p>
            </div>
            <div className="text-center">
              <Truck className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">{t("home.features.delivery_title")}</h3>
              <p className="text-muted-foreground">{t("home.features.delivery_desc", { amount: shippingThreshold })}</p>
            </div>
            <div className="text-center">
              <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">{t("home.features.quality_title")}</h3>
              <p className="text-muted-foreground">{t("home.features.quality_desc")}</p>
            </div>
            <div className="text-center">
              <Zap className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">{t("home.features.support_title")}</h3>
              <p className="text-muted-foreground">{t("home.features.support_desc")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <FeaturedProducts />

      {/* CTA Section */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto bg-card rounded-lg p-12 text-center border border-border">
          <h2 className="text-3xl font-bold mb-4">{t("home.ready_title")}</h2>
          <p className="text-muted-foreground mb-8 text-lg">
            {t("home.ready_desc")}
          </p>
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <Link
              href="/shop"
              className="bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-8 rounded-lg transition"
            >
              {t("home.browse_products")}
            </Link>
            <Link
              href="/contact"
              className="bg-muted hover:bg-border text-foreground font-semibold py-3 px-8 rounded-lg transition"
            >
              {t("home.contact_team")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

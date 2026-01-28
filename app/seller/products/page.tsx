"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Edit, Eye } from "lucide-react"
import { DeleteProductButton } from "@/components/delete-product-button"
import { useLanguage } from "@/lib/context/language-context"

export default function SellerProductsPage() {
  const router = useRouter()
  const supabase = createClient()
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [seller, setSeller] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])

  useEffect(() => {
    async function fetchData() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login")
        return
      }

      // Get seller profile
      const { data: sellerData } = await supabase.from("sellers").select("*").eq("user_id", user.id).single()

      if (!sellerData) {
        router.push("/seller/register")
        return
      }
      setSeller(sellerData)

      // Get seller's products
      const { data: productsData } = await supabase
        .from("products")
        .select("*")
        .eq("seller_id", sellerData.id)
        .order("created_at", { ascending: false })

      setProducts(productsData || [])
      setLoading(false)
    }

    fetchData()
  }, [supabase, router])

  if (loading) {
    return <div className="container mx-auto px-4 py-8">{t("common.loading")}</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">{t("seller_products.title")}</h1>
          <p className="text-muted-foreground">{t("seller_products.subtitle")}</p>
        </div>
        <Link href="/seller/products/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {t("seller_products.add_product")}
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="pt-6">
          {!products || products.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">{t("seller_products.no_products")}</p>
              <Link href="/seller/products/new">
                <Button>{t("seller_products.create_first_product")}</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">{t("seller_products.product")}</th>
                    <th className="text-left py-3 px-4 font-semibold">{t("seller_products.category")}</th>
                    <th className="text-right py-3 px-4 font-semibold">{t("seller_products.price")}</th>
                    <th className="text-right py-3 px-4 font-semibold">{t("seller_products.stock")}</th>
                    <th className="text-center py-3 px-4 font-semibold">{t("seller_products.status")}</th>
                    <th className="text-center py-3 px-4 font-semibold">{t("seller_products.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-muted-foreground">{product.brand}</div>
                      </td>
                      <td className="py-3 px-4">{product.category}</td>
                      <td className="py-3 px-4 text-right">
                        {product.price > 0 ? `R${product.price.toFixed(2)}` : t("seller_products.not_set")}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`px-2 py-1 rounded text-sm ${product.stock_quantity > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                        >
                          {product.stock_quantity}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-1 rounded text-xs ${seller.verification_status === "approved" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}`}
                        >
                          {seller.verification_status === "approved" ? t("seller_products.live") : t("seller_products.pending")}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-center gap-2">
                          <Link href={`/seller/products/${product.id}`}>
                            <Button variant="outline" size="sm" className="bg-transparent">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/seller/products/${product.id}/edit`}>
                            <Button variant="outline" size="sm" className="bg-transparent">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <DeleteProductButton productId={product.id} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

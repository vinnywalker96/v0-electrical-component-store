"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import type { Product } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trash2, Edit, Plus, ArrowLeft } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox" // Import Checkbox
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import cache from "@/lib/redis"; // Import Cache
import { useLanguage } from "@/lib/context/language-context"
import { getTranslation } from "@/lib/utils/translation"


const CACHE_EXPIRY_SECONDS = 180; // Cache for 3 minutes (reduced for admin panel)

export default function AdminProductsPage() {
  const supabase = createClient()
  const { language, t } = useLanguage()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [manufacturerFilter, setManufacturerFilter] = useState("all")
  const [stockStatusFilter, setStockStatusFilter] = useState("all")
  const [categories, setCategories] = useState<string[]>([])
  const [manufacturers, setManufacturers] = useState<string[]>([])
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]) // For bulk actions
  const [translatedNames, setTranslatedNames] = useState<Record<string, string>>({})

  // Auto-translate product names when translation is missing
  useEffect(() => {
    // Reset translations when language changes
    setTranslatedNames({})

    if (language === "pt") {
      products.forEach((product) => {
        if (!product.name_pt && product.name) {
          getTranslation(product.name, "pt").then((translated) => {
            setTranslatedNames((prev) => ({ ...prev, [product.id]: translated }))
          })
        }
      })
    } else if (language === "en") {
      products.forEach((product) => {
        if (!product.name && product.name_pt) {
          getTranslation(product.name_pt, "en").then((translated) => {
            setTranslatedNames((prev) => ({ ...prev, [product.id]: translated }))
          })
        }
      })
    }
  }, [language, products])

  useEffect(() => {
    const fetchFilters = async () => {
      // Fetch unique categories
      const { data: catData } = await supabase.from("products").select("category").neq("category", null)
      const uniqueCategories = [...new Set((catData || []).map(p => p.category))]
      setCategories(uniqueCategories);

      // Fetch unique manufacturers
      const { data: manufacturerData } = await supabase.from("products").select("manufacturer").neq("manufacturer", null)
      const uniqueManufacturers = [...new Set((manufacturerData || []).map(p => p.manufacturer))]
      setManufacturers(uniqueManufacturers);
    }
    fetchFilters();
  }, [supabase, setCategories, setManufacturers]);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const cacheKey = `admin:products:search=${searchQuery}:cat=${categoryFilter}:manufacturer=${manufacturerFilter}:stock=${stockStatusFilter}`;

        try {
          const cachedProducts = await cache.get(cacheKey);
          if (cachedProducts) {
            setProducts(JSON.parse(cachedProducts as string));
            setLoading(false);
            return;
          }
        } catch (cacheError) {
          console.warn("Cache GET error for products:", cacheError);
        }

        let query = supabase.from("products").select("*")

        if (searchQuery) {
          query = query.ilike("name", `%${searchQuery}%`)
        }
        if (categoryFilter !== "all") {
          query = query.eq("category", categoryFilter)
        }
        if (manufacturerFilter !== "all") {
          query = query.eq("manufacturer", manufacturerFilter)
        }
        if (stockStatusFilter === "in_stock") {
          query = query.gt("stock_quantity", 0)
        } else if (stockStatusFilter === "out_of_stock") {
          query = query.lte("stock_quantity", 0)
        }

        const { data, error } = await query.order("created_at", { ascending: false })

        if (error) throw error;

        setProducts(data || [])
        console.log("Products fetched:", data);

        try {
          await cache.set(cacheKey, JSON.stringify(data), { ex: CACHE_EXPIRY_SECONDS });
        } catch (cacheError) {
          console.warn("Cache SET error for products:", cacheError);
        }

      } catch (error) {
        console.error("[v0] Error fetching products:", error)
        toast({
          title: t("common.error"),
          description: "Failed to fetch products.",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [supabase, searchQuery, categoryFilter, manufacturerFilter, stockStatusFilter])

  const handleSelectProduct = (productId: string) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSelectAll = () => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(products.map(p => p.id));
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(t("product_actions.confirm_delete"))) return;

    try {
      const { error } = await supabase.from("products").delete().in("id", selectedProducts);
      if (error) throw error;

      setProducts(products.filter(p => !selectedProducts.includes(p.id)));
      setSelectedProducts([]);
      toast({
        title: t("common.success"),
        description: t("product_actions.delete_success"),
      });
    } catch (error) {
      console.error("Error bulk deleting products:", error);
      toast({
        title: t("common.error"),
        description: t("product_actions.delete_error"),
        variant: "destructive"
      });
    }
  };

  async function handleDelete(id: string) {
    if (!confirm(t("product_actions.confirm_delete"))) { // Using window.confirm for blocking confirmation
      return
    }

    try {
      const { error } = await supabase.from("products").delete().eq("id", id)

      if (error) throw error

      setProducts(products.filter((p) => p.id !== id))
      toast({
        title: t("common.success"),
        description: t("product_actions.delete_success"),
      });
    } catch (error) {
      console.error("[v0] Error deleting product:", JSON.stringify(error, null, 2))
      toast({
        title: t("common.error"),
        description: t("product_actions.delete_error"),
        variant: "destructive"
      });
    }
  }

  if (loading) {
    return <div className="text-center py-12">{t("admin_dashboard.loading_products")}</div>
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Link href="/admin/dashboard" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-8">
          <ArrowLeft size={20} />
          {t("admin_dashboard.back_to_dashboard")}
        </Link>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground">{t("admin_dashboard.manage_products_title")}</h1>
          <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
            {selectedProducts.length > 0 && (
              <Button variant="destructive" onClick={handleBulkDelete} className="flex-1 sm:flex-none">
                {t("admin_dashboard.delete_selected")} ({selectedProducts.length})
              </Button>
            )}
            <Link href="/admin/products/new" className="flex-1 sm:flex-none">
              <Button className="w-full flex gap-2">
                <Plus size={20} />
                {t("admin_dashboard.add_product")}
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder={t("admin_dashboard.search_by_name")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t("admin_dashboard.all_categories")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin_dashboard.all_categories")}</SelectItem>
                {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={manufacturerFilter} onValueChange={setManufacturerFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t("admin_dashboard.all_manufacturers")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin_dashboard.all_manufacturers")}</SelectItem>
                {manufacturers.map(manufacturer => <SelectItem key={manufacturer} value={manufacturer}>{manufacturer}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={stockStatusFilter} onValueChange={setStockStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t("admin_dashboard.stock")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin_dashboard.all_stock_statuses")}</SelectItem>
                <SelectItem value="in_stock">{t("admin_dashboard.in_stock")}</SelectItem>
                <SelectItem value="out_of_stock">{t("admin_dashboard.out_of_stock")}</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {products.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-600 mb-4">{t("admin_dashboard.no_products")}</p>
                <Link href="/admin/products/new">
                  <Button>{t("admin_dashboard.create_first_product")}</Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="py-3 px-4">
                        <Checkbox
                          checked={selectedProducts.length === products.length}
                          onCheckedChange={handleSelectAll}
                        />
                      </th>
                      <th className="text-left py-3 px-4 font-semibold">{t("admin_dashboard.name")}</th>
                      <th className="text-left py-3 px-4 font-semibold">{t("admin_dashboard.category")}</th>
                      <th className="text-left py-3 px-4 font-semibold">{t("admin_dashboard.manufacturer")}</th>
                      <th className="text-right py-3 px-4 font-semibold">{t("admin_dashboard.price")}</th>
                      <th className="text-right py-3 px-4 font-semibold">{t("admin_dashboard.stock")}</th>
                      <th className="text-center py-3 px-4 font-semibold">{t("common.actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => {
                      console.log("Rendering product with ID:", product.id); // Add this log
                      return (
                        <tr key={product.id} className="border-b hover:bg-slate-50">
                          <td className="py-3 px-4">
                            <Checkbox
                              checked={selectedProducts.includes(product.id)}
                              onCheckedChange={() => handleSelectProduct(product.id)}
                            />
                          </td>
                          <td className="py-3 px-4 font-semibold">
                            <Link href={`/admin/products/detail?id=${product.id}`} className="text-blue-600 hover:underline">
                              {language === "pt" && product.name_pt
                                ? product.name_pt
                                : language === "pt" && translatedNames[product.id]
                                  ? translatedNames[product.id]
                                  : product.name}
                            </Link>
                          </td>
                          <td className="py-3 px-4">{product.category}</td>
                          <td className="py-3 px-4">{product.manufacturer}</td>
                          <td className="py-3 px-4 text-right">${product.price.toFixed(2)}</td>
                          <td className="py-3 px-4 text-right">
                            <span
                              className={`px-2 py-1 rounded text-sm ${product.stock_quantity > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                            >
                              {product.stock_quantity}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center flex justify-center gap-2">
                            <Link href={`/admin/products/edit?id=${product.id}`}>
                              <Button variant="outline" size="sm" className="gap-1 bg-transparent">
                                <Edit size={16} />
                                {t("admin_dashboard.edit")}
                              </Button>
                            </Link>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 gap-1 bg-transparent"
                              onClick={() => handleDelete(product.id)}
                            >
                              <Trash2 size={16} />
                              {t("admin_dashboard.delete")}
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

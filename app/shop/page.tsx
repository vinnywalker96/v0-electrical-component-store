"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Product } from "@/lib/types"
import { ProductCard } from "@/components/product-card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import cache from "@/lib/redis" // Import Cache
import { useLanguage } from "@/lib/context/language-context"

const CACHE_EXPIRY_SECONDS = 300; // Cache for 5 minutes (reduced from 60 for better freshness)

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedBrand, setSelectedBrand] = useState<string>("all")
  const [selectedSeller, setSelectedSeller] = useState<string>("all")
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000])
  const [maxPrice, setMaxPrice] = useState(10000)
  const [sellers, setSellers] = useState<any[]>([])
  const [isMounted, setIsMounted] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const { t } = useLanguage()

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const supabase = createClient()

  const fetchProducts = useCallback(async () => {
    try {
      const CACHE_KEY_PRODUCTS = "shop:all_products";
      let cachedProducts = null;
      try {
        cachedProducts = await cache.get(CACHE_KEY_PRODUCTS);
      } catch (cacheError) {
        console.warn("Cache GET error for products:", cacheError);
      }

      if (cachedProducts) {
        setProducts(JSON.parse(cachedProducts));
        console.log("Products loaded from cache.");
        // We still need to set loading to false, even with cache
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("products")
        .select("*, seller:sellers(id, store_name, rating)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);

      if (data && data.length > 0) {
        const highestPrice = Math.max(...data.map((p) => p.price || 0));
        const roundedMax = Math.ceil(highestPrice / 100) * 100 || 10000;
        setMaxPrice(roundedMax);
        setPriceRange([0, roundedMax]);
      }

      try {
        await cache.set(CACHE_KEY_PRODUCTS, JSON.stringify(data), { ex: CACHE_EXPIRY_SECONDS });
      } catch (cacheError) {
        console.warn("Cache SET error for products:", cacheError);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase, setProducts, setMaxPrice, setPriceRange]);

  const fetchSellers = useCallback(async () => {
    try {
      const CACHE_KEY_SELLERS = "shop:approved_sellers";
      let cachedSellers = null;
      try {
        cachedSellers = await cache.get(CACHE_KEY_SELLERS);
      } catch (cacheError) {
        console.warn("Cache GET error for sellers:", cacheError);
      }

      if (cachedSellers) {
        setSellers(JSON.parse(cachedSellers));
        console.log("Sellers loaded from cache.");
        return;
      }

      const { data } = await supabase.from("sellers").select("id, store_name").eq("verification_status", "approved");
      setSellers(data || []);

      try {
        await cache.set(CACHE_KEY_SELLERS, JSON.stringify(data), { ex: CACHE_EXPIRY_SECONDS });
      } catch (cacheError) {
        console.warn("Cache SET error for sellers:", cacheError);
      }
    } catch (error) {
      console.error("Error fetching sellers:", error);
    }
  }, [supabase, setSellers]);

  useEffect(() => {
    fetchProducts()
    fetchSellers()
  }, [fetchProducts, fetchSellers])

  const categories = useMemo(() => [...new Set(products.map((p) => p.category).filter(Boolean))], [products])
  const brands = useMemo(() => [...new Set(products.map((p) => p.brand).filter(Boolean))], [products])

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategory === "all" || product.category === selectedCategory
      const matchesBrand = selectedBrand === "all" || product.brand === selectedBrand
      const matchesSeller = selectedSeller === "all" || !product.seller_id || product.seller_id === selectedSeller
      const matchesPrice = product.price >= priceRange[0] && product.price <= priceRange[1]

      return matchesSearch && matchesCategory && matchesBrand && matchesSeller && matchesPrice
    })
  }, [products, searchQuery, selectedCategory, selectedBrand, selectedSeller, priceRange])

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">{t("shop_page.title")}</h1>
            <p className="text-muted-foreground">{t("shop_page.subtitle")}</p>
          </div>
          <Button
            className="md:hidden"
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? t("common.hide_filters") : t("common.show_filters")}
          </Button>
        </div>

        {/* Filters */}
        {isMounted && (
          <div className={`${showFilters ? 'block' : 'hidden'} md:block bg-card rounded-lg border border-border p-6 mb-8`}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">{t("shop_page.filters.search")}</label>
                <Input
                  placeholder={t("shop_page.filters.search_placeholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">{t("shop_page.filters.category")}</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("shop_page.filters.all_categories")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("shop_page.filters.all_categories")}</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">{t("shop_page.filters.brand")}</label>
                <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("shop_page.filters.all_brands")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("shop_page.filters.all_brands")}</SelectItem>
                    {brands.map((brand) => (
                      <SelectItem key={brand} value={brand}>
                        {brand}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">{t("shop_page.filters.seller")}</label>
                <Select value={selectedSeller} onValueChange={setSelectedSeller}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("shop_page.filters.all_sellers")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("shop_page.filters.all_sellers")}</SelectItem>
                    {sellers.map((seller) => (
                      <SelectItem key={seller.id} value={seller.id}>
                        {seller.store_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  {t("shop_page.filters.max_price")}: R{priceRange[1].toFixed(0)}
                </label>
                <Slider
                  value={[priceRange[1]]}
                  onValueChange={(val) => setPriceRange([0, val[0]])}
                  min={0}
                  max={maxPrice}
                  step={10}
                  className="w-full"
                />
              </div>

              <div className="flex items-end">
                <Button
                  onClick={() => {
                    setSearchQuery("")
                    setSelectedCategory("all")
                    setSelectedBrand("all")
                    setSelectedSeller("all")
                    setPriceRange([0, maxPrice])
                  }}
                  variant="outline"
                  className="w-full"
                >
                  {t("shop_page.filters.reset")}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Products Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">{t("shop_page.loading")}</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 bg-muted rounded-lg">
            <p className="text-muted-foreground text-lg">{t("shop_page.no_results")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        <div className="mt-8 text-center text-sm text-muted-foreground">
          {t("shop_page.showing_results", { count: filteredProducts.length.toString(), total: products.length.toString() })}
        </div>
      </div>
    </main>
  )
}

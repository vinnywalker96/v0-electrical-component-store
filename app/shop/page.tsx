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
import { useCurrency } from "@/lib/context/currency-context"
import type { Category } from "@/lib/types"

const CACHE_EXPIRY_SECONDS = 300; // Cache for 5 minutes (reduced from 60 for better freshness)

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSeller, setSelectedSeller] = useState<string>("all")
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>("all")
  const [dbCategories, setDbCategories] = useState<Category[]>([])
  const [selectedMainCategoryId, setSelectedMainCategoryId] = useState<string>("all")
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState<string>("all")
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000])
  const [maxPrice, setMaxPrice] = useState(10000)
  const [sellers, setSellers] = useState<any[]>([])
  const [isMounted, setIsMounted] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const { t, language } = useLanguage()
  const { formatPrice } = useCurrency()

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

  const fetchCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .range(0, 2000)
        .order('name', { ascending: true });
      if (error) throw error;
      setDbCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  }, [supabase]);

  useEffect(() => {
    fetchProducts()
    fetchSellers()
    fetchCategories()
  }, [fetchProducts, fetchSellers, fetchCategories])

  const mainCategories = useMemo<Category[]>(() => dbCategories.filter(c => !c.parent_id), [dbCategories])
  const subCategories = useMemo<Category[]>(() => {
    if (selectedMainCategoryId === "all") return []
    return dbCategories.filter(c => c.parent_id === selectedMainCategoryId)
  }, [dbCategories, selectedMainCategoryId])

  const manufacturers = useMemo(() => [...new Set(products.map((p) => p.manufacturer).filter(Boolean))], [products])

  const filteredProducts = useMemo<Product[]>(() => {
    return (products as Product[]).filter((product: Product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.name_pt && product.name_pt.toLowerCase().includes(searchQuery.toLowerCase())) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.description_pt && product.description_pt.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesMainCategory = selectedMainCategoryId === "all" ||
        product.category_id === selectedMainCategoryId ||
        (product as any).category_path?.includes(mainCategories.find(c => c.id === selectedMainCategoryId)?.name)

      const matchesSubCategory = selectedSubCategoryId === "all" ||
        product.category_id === selectedSubCategoryId

      const matchesManufacturer = selectedManufacturer === "all" || product.manufacturer === selectedManufacturer
      const matchesSeller = selectedSeller === "all" || !product.seller_id || product.seller_id === selectedSeller
      const matchesPrice = product.price >= priceRange[0] && product.price <= priceRange[1]

      return matchesSearch && matchesMainCategory && matchesSubCategory && matchesManufacturer && matchesSeller && matchesPrice
    })
  }, [products, searchQuery, selectedMainCategoryId, selectedSubCategoryId, selectedManufacturer, selectedSeller, priceRange, mainCategories])

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }, [])

  const handleMainCategoryChange = useCallback((val: string) => {
    setSelectedMainCategoryId(val)
    setSelectedSubCategoryId("all")
  }, [])

  const handlePriceChange = useCallback((val: number[]) => {
    setPriceRange([0, val[0]])
  }, [])

  const handleReset = useCallback(() => {
    setSearchQuery("")
    setSelectedMainCategoryId("all")
    setSelectedSubCategoryId("all")
    setSelectedManufacturer("all")
    setSelectedSeller("all")
    setPriceRange([0, maxPrice])
  }, [maxPrice])

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
          <div className={`space-y-6 bg-card rounded-xl border-2 border-border p-8 mb-10 shadow-lg relative ${showFilters ? 'block' : 'hidden md:block'}`}>
            <div className="absolute top-0 left-0 w-1 h-full bg-primary/20" />
            {/* Top Row: Search and Categories */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-4">
                <label className="text-sm font-semibold text-foreground mb-2.5 block uppercase tracking-wide">{t("shop_page.filters.search")}</label>
                <Input
                  placeholder={t("shop_page.filters.search_placeholder")}
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full"
                />
              </div>

              <div className="lg:col-span-4">
                <label className="text-sm font-semibold text-foreground mb-2.5 block uppercase tracking-wide">{t("shop_page.filters.category")}</label>
                <Select value={selectedMainCategoryId} onValueChange={handleMainCategoryChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("shop_page.filters.all_categories")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("shop_page.filters.all_categories")}</SelectItem>
                    {mainCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {language === "pt" ? cat.name_pt || cat.name : cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="lg:col-span-4">
                <label className="text-sm font-semibold text-foreground mb-2.5 block uppercase tracking-wide">{t("shop_page.filters.subcategory")}</label>
                <Select
                  value={selectedSubCategoryId}
                  onValueChange={setSelectedSubCategoryId}
                  disabled={selectedMainCategoryId === "all"}
                >
                  <SelectTrigger className={`w-full ${selectedMainCategoryId === "all" ? 'opacity-50' : ''}`}>
                    <SelectValue placeholder={selectedMainCategoryId === "all" ? t("categories.select_category_first") : t("categories.no_subcategory")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("categories.no_subcategory")}</SelectItem>
                    {subCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {language === "pt" ? cat.name_pt || cat.name : cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Bottom Row: Manufacturer, Seller, Price, Reset */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4 border-t border-border/50">
              <div>
                <label className="text-sm font-semibold text-foreground mb-2.5 block uppercase tracking-wide">{t("shop_page.filters.manufacturer")}</label>
                <Select value={selectedManufacturer} onValueChange={setSelectedManufacturer}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("shop_page.filters.all_manufacturers")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("shop_page.filters.all_manufacturers")}</SelectItem>
                    {manufacturers.map((manufacturer) => (
                      <SelectItem key={manufacturer} value={manufacturer}>
                        {manufacturer}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-2.5 block uppercase tracking-wide">{t("shop_page.filters.seller")}</label>
                <Select value={selectedSeller} onValueChange={setSelectedSeller}>
                  <SelectTrigger className="w-full">
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
                  {t("shop_page.filters.max_price")}: {formatPrice(priceRange[1])}
                </label>
                <Slider
                  value={[priceRange[1]]}
                  onValueChange={handlePriceChange}
                  min={0}
                  max={maxPrice}
                  step={10}
                  className="w-full"
                />
              </div>

              <div className="flex items-end">
                <Button
                  onClick={handleReset}
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

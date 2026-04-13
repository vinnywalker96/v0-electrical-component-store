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
import { Search, ChevronDown, ChevronRight, Filter, SlidersHorizontal } from "lucide-react"

const CACHE_EXPIRY_SECONDS = 300; // Cache for 5 minutes (reduced from 60 for better freshness)

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>("all")
  const [dbCategories, setDbCategories] = useState<Category[]>([])
  const [selectedMainCategoryId, setSelectedMainCategoryId] = useState<string>("all")
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState<string>("all")
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000])
  const [maxPrice, setMaxPrice] = useState(10000)
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
        .select("*")
        .order("name", { ascending: true });

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
    fetchCategories()
  }, [fetchProducts, fetchCategories])

  const mainCategories = useMemo<Category[]>(() => {
    const mains = dbCategories.filter(c => !c.parent_id);
    const unique = new Map();
    mains.forEach(c => { if (!unique.has(c.name)) unique.set(c.name, c); });
    return Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [dbCategories])

  const subCategories = useMemo<Category[]>(() => {
    if (selectedMainCategoryId === "all") return []
    const subs = dbCategories.filter(c => c.parent_id === selectedMainCategoryId)
    const unique = new Map();
    subs.forEach(c => { if (!unique.has(c.name)) unique.set(c.name, c); });
    return Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [dbCategories, selectedMainCategoryId])

  const manufacturers = useMemo(() => {
    const unique = [...new Set(products.map((p) => p.manufacturer).filter(Boolean))];
    return unique.sort((a, b) => a.localeCompare(b));
  }, [products])

  const filteredProducts = useMemo<Product[]>(() => {
    return (products as Product[]).filter((product: Product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.name_pt && product.name_pt.toLowerCase().includes(searchQuery.toLowerCase())) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.description_pt && product.description_pt.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesMainCategory = selectedMainCategoryId === "all" ||
        product.category_id === selectedMainCategoryId ||
        dbCategories.find(c => c.id === product.category_id)?.parent_id === selectedMainCategoryId ||
        (product as any).category_path?.includes(mainCategories.find(c => c.id === selectedMainCategoryId)?.name)

      const matchesSubCategory = selectedSubCategoryId === "all" ||
        product.category_id === selectedSubCategoryId

      const matchesManufacturer = selectedManufacturer === "all" || product.manufacturer === selectedManufacturer
      const matchesPrice = product.price >= priceRange[0] && product.price <= priceRange[1]

      return matchesSearch && matchesMainCategory && matchesSubCategory && matchesManufacturer && matchesPrice
    })
  }, [products, searchQuery, selectedMainCategoryId, selectedSubCategoryId, selectedManufacturer, priceRange, mainCategories])

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
    setPriceRange([0, maxPrice])
  }, [maxPrice])

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-[1500px] mx-auto px-4 md:px-12 py-12">
        <div className="flex flex-col space-y-12">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
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

          {/* High-Fidelity Shop Filter Bar - 4-and-1 Grid Layout */}
          <div className={`${showFilters ? "block" : "hidden md:block"} bg-white p-4 md:p-8 rounded-[2rem] md:rounded-[3.5rem] border border-slate-100 shadow-2xl shadow-slate-200/40 mb-8 animate-in fade-in slide-in-from-top-4 duration-700`}>
            <div className="space-y-8">
              {/* Row 1: Search + 3 Selects (Fixed Grid) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5" />
                  <Input
                    placeholder={t("shop_page.filters.search_placeholder")}
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="pl-14 h-14 bg-slate-50/50 border-none rounded-full text-slate-900 font-bold placeholder:text-slate-300 focus-visible:ring-blue-500/10 shadow-inner"
                  />
                </div>

                {/* Main Category */}
                <Select value={selectedMainCategoryId} onValueChange={handleMainCategoryChange}>
                  <SelectTrigger className="h-14 bg-white border-slate-100 rounded-full font-bold text-slate-600 shadow-sm px-8 hover:shadow-md transition-all">
                    <SelectValue placeholder={t("shop_page.filters.all_categories")} />
                  </SelectTrigger>
                  <SelectContent className="rounded-[2rem] border-slate-100 shadow-2xl p-2 bg-white/95 backdrop-blur-xl">
                    <SelectItem value="all" className="rounded-2xl font-bold py-4 uppercase tracking-tighter opacity-50">{t("shop_page.filters.all_categories")}</SelectItem>
                    {mainCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id} className="rounded-2xl font-bold py-4">
                        {language === "pt" ? cat.name_pt || cat.name : cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Subcategory */}
                <Select
                  value={selectedSubCategoryId}
                  onValueChange={setSelectedSubCategoryId}
                  disabled={selectedMainCategoryId === "all" || subCategories.length === 0}
                >
                  <SelectTrigger className="h-14 bg-white border-slate-100 rounded-full font-bold text-slate-600 shadow-sm px-8 hover:shadow-md transition-all disabled:opacity-30">
                    <SelectValue placeholder="All Subcategories" />
                  </SelectTrigger>
                  <SelectContent className="rounded-[2rem] border-slate-100 shadow-2xl p-2">
                    <SelectItem value="all" className="rounded-2xl font-bold py-4 uppercase tracking-tighter opacity-50">All Subcategories</SelectItem>
                    {subCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id} className="rounded-2xl font-bold py-4">
                        {language === "pt" ? cat.name_pt || cat.name : cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Manufacturer */}
                <Select value={selectedManufacturer} onValueChange={setSelectedManufacturer}>
                  <SelectTrigger className="h-14 bg-white border-slate-100 rounded-full font-bold text-slate-600 shadow-sm px-8 hover:shadow-md transition-all">
                    <SelectValue placeholder="All Manufacturers" />
                  </SelectTrigger>
                  <SelectContent className="rounded-[2rem] border-slate-100 shadow-2xl p-2">
                    <SelectItem value="all" className="rounded-2xl font-bold py-4 uppercase tracking-tighter opacity-50">All Manufacturers</SelectItem>
                    {manufacturers.map((mf) => (
                      <SelectItem key={mf} value={mf} className="rounded-2xl font-bold py-4">{mf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Bottom Row: Price Range + Applied Filters Display */}
              <div className="flex flex-col lg:flex-row items-center gap-6 md:gap-10 pt-4">
                <div className="flex-1 w-full space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">Budget Constraint</span>
                    <span className="text-sm font-black text-blue-600 bg-blue-50 px-6 py-2 rounded-full border border-blue-100">{formatPrice(0)} — {formatPrice(priceRange[1])}</span>
                  </div>
                  <Slider
                    min={0}
                    max={maxPrice}
                    step={100}
                    value={[priceRange[1]]}
                    onValueChange={handlePriceChange}
                    className="py-6"
                  />
                </div>

                <div className="flex items-center gap-6 shrink-0">
                  <div className="flex flex-col items-end">
                    <span className="text-2xl font-black text-slate-900 leading-none">{filteredProducts.length}</span>
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-1">Matched Units</span>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={handleReset}
                    className="h-12 px-8 rounded-full font-black uppercase tracking-[0.2em] text-[10px] text-slate-400 hover:bg-slate-50 hover:text-slate-900 transition-all border border-slate-100"
                  >
                    Clear Path
                  </Button>
                </div>
              </div>
            </div>
          </div>

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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          <div className="mt-8 text-center text-sm text-muted-foreground">
            {t("shop_page.showing_results", { count: filteredProducts.length.toString(), total: products.length.toString() })}
          </div>
        </div>
      </div>
    </main>
  )
}

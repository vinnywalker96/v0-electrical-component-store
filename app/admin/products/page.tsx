"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import type { Product } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Search, Trash2, Edit, Plus, ArrowLeft, Package, ChevronRight, ChevronDown, ChevronLeft } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox" // Import Checkbox
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import cache from "@/lib/redis"; // Import Cache
import { useLanguage } from "@/lib/context/language-context"
import { getTranslation } from "@/lib/utils/translation"
import { useCurrency } from "@/lib/context/currency-context"


const CACHE_EXPIRY_SECONDS = 180; // Cache for 3 minutes (reduced for admin panel)

export default function AdminProductsPage() {
  const supabase = createClient()
  const { language, t } = useLanguage()
  const { formatPrice } = useCurrency()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [manufacturerFilter, setManufacturerFilter] = useState("all")
  const [stockStatusFilter, setStockStatusFilter] = useState("all")
  const [categories, setCategories] = useState<{ id: string; name: string; parent_id: string | null }[]>([])
  const [manufacturers, setManufacturers] = useState<string[]>([])
  const [subCategoryFilter, setSubCategoryFilter] = useState("all")
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]) // For bulk actions
  const [translatedNames, setTranslatedNames] = useState<Record<string, string>>({})
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;
  const [expandedRows, setExpandedRows] = useState<string[]>([]);

  // Derived main / sub categories with name-based uniqueness
  const mainCategories = useMemo(() => {
    const mains = categories.filter(c => !c.parent_id);
    const unique = new Map();
    mains.forEach(c => {
      // Use name as key to prevent visual duplicates in the dropdown
      if (!unique.has(c.name)) unique.set(c.name, c);
    });
    return Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [categories])

  const subCategories = useMemo(() => {
    if (categoryFilter === "all") return []
    const subs = categories.filter(c => c.parent_id === categoryFilter)
    const unique = new Map();
    subs.forEach(c => {
      if (!unique.has(c.name)) unique.set(c.name, c);
    });
    return Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, categoryFilter])

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
      // Fetch ALL categories (mains + subs) from the categories table — same source as shop page
      const { data: catData } = await supabase
        .from("categories")
        .select("id, name, parent_id")
        .order("name", { ascending: true })
      setCategories((catData || []) as { id: string; name: string; parent_id: string | null }[]);

      // Fetch unique manufacturers
      const { data: manufacturerData } = await supabase.from("products").select("manufacturer").neq("manufacturer", null)
      const uniqueManufacturers = [...new Set((manufacturerData || []).map(p => p.manufacturer))].filter(val => val && val.toString().trim() !== "") as string[]
      setManufacturers(uniqueManufacturers);
    }
    fetchFilters();
  }, [supabase]);

  // Debounce search — only fire fetch 400ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    const fetchProducts = async () => {
      const isFirstLoad = products.length === 0
      if (isFirstLoad) setLoading(true); else setSearching(true);
      try {
        const cacheKey = `admin:products:page=${currentPage}:search=${debouncedSearch}:cat=${categoryFilter}:sub=${subCategoryFilter}:manufacturer=${manufacturerFilter}:stock=${stockStatusFilter}`;

        try {
          const cachedProducts = await cache.get(cacheKey);
          if (cachedProducts) {
            const { data, count } = JSON.parse(cachedProducts as string);
            setProducts(data);
            setTotalCount(count);
            setLoading(false);
            return;
          }
        } catch (cacheError) {
          console.warn("Cache GET error for products:", cacheError);
        }

        let query = supabase.from("products").select("*", { count: "exact" })

        if (debouncedSearch) {
          query = query.ilike("name", `%${debouncedSearch}%`)
        }
        if (categoryFilter !== "all") {
          const filterById = subCategoryFilter !== "all" ? subCategoryFilter : categoryFilter
          query = query.eq("category_id", filterById)
        }
        if (manufacturerFilter !== "all") {
          query = query.eq("manufacturer", manufacturerFilter)
        }
        if (stockStatusFilter === "in_stock") {
          query = query.gt("stock_quantity", 0)
        } else if (stockStatusFilter === "out_of_stock") {
          query = query.lte("stock_quantity", 0)
        }

        // Apply Pagination & Sorting (A-Z)
        const from = (currentPage - 1) * pageSize;
        const to = from + pageSize - 1;

        const { data, error, count } = await query
          .order("name", { ascending: true })
          .range(from, to)

        if (error) throw error;

        setProducts(data || [])
        setTotalCount(count || 0)

        try {
          await cache.set(cacheKey, JSON.stringify({ data, count }), { ex: CACHE_EXPIRY_SECONDS });
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
        setSearching(false)
      }
    }

    fetchProducts()
  }, [supabase, debouncedSearch, categoryFilter, subCategoryFilter, manufacturerFilter, stockStatusFilter, currentPage])

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
      <div className="max-w-[1500px] mx-auto px-0 py-0">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Manage Products</h1>
          <div className="flex gap-4">
            {selectedProducts.length > 0 && (
              <Button 
                onClick={handleBulkDelete}
                variant="outline"
                className="rounded-full border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 h-14 px-8 font-bold shadow-sm gap-2 animate-in fade-in slide-in-from-right-4"
              >
                <Trash2 size={18} />
                Delete Selected ({selectedProducts.length})
              </Button>
            )}
            <Link href="/admin/products/new">
              <Button className="rounded-full bg-blue-600 hover:bg-blue-700 h-14 px-8 font-bold shadow-lg shadow-blue-200 gap-2">
                <Plus size={18} />
                Add Product
              </Button>
            </Link>
          </div>
        </div>

        {/* High-Fidelity Filter Bar - 4-and-1 Grid Layout */}
        <div className="bg-white p-6 rounded-[3.5rem] border border-slate-100 shadow-2xl shadow-slate-200/40 mb-8">
          <div className="space-y-6">
            {/* Row 1: Search + 3 Selects (Fixed Grid) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="relative">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5" />
                <Input
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-14 h-14 bg-slate-50/50 border-none rounded-full text-slate-900 font-bold placeholder:text-slate-300 focus-visible:ring-blue-500/10 shadow-inner"
                />
              </div>

              <Select
                value={categoryFilter}
                onValueChange={(val) => {
                  setCategoryFilter(val)
                  setSubCategoryFilter("all")
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="h-14 bg-white border-slate-100 rounded-full font-bold text-slate-600 shadow-sm px-8 hover:shadow-md transition-all">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent className="rounded-[2rem] border-slate-100 shadow-2xl p-2 bg-white/95 backdrop-blur-xl">
                  <SelectItem value="all" className="rounded-2xl font-bold py-4 uppercase tracking-tighter opacity-50">All Categories</SelectItem>
                  {mainCategories.map(cat => <SelectItem key={cat.id} value={cat.id} className="rounded-2xl font-bold py-4">{cat.name}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select
                value={subCategoryFilter}
                onValueChange={(val) => {
                  setSubCategoryFilter(val)
                  setCurrentPage(1)
                }}
                disabled={categoryFilter === "all"}
              >
                <SelectTrigger className="h-14 bg-white border-slate-100 rounded-full font-bold text-slate-600 shadow-sm px-8 hover:shadow-md transition-all disabled:opacity-30">
                  <SelectValue placeholder="All Subcategories" />
                </SelectTrigger>
                <SelectContent className="rounded-[2rem] border-slate-100 shadow-2xl p-2 bg-white/95 backdrop-blur-xl">
                  <SelectItem value="all" className="rounded-2xl font-bold py-4 uppercase tracking-tighter opacity-50">All Subcategories</SelectItem>
                  {subCategories.map(cat => <SelectItem key={cat.id} value={cat.id} className="rounded-2xl font-bold py-4">{cat.name}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={manufacturerFilter} onValueChange={(val) => { setManufacturerFilter(val); setCurrentPage(1); }}>
                <SelectTrigger className="h-14 bg-white border-slate-100 rounded-full font-bold text-slate-600 shadow-sm px-8 hover:shadow-md transition-all">
                  <SelectValue placeholder="All Manufacturers" />
                </SelectTrigger>
                <SelectContent className="rounded-[2rem] border-slate-100 shadow-2xl p-2">
                  <SelectItem value="all" className="rounded-2xl font-bold py-4 uppercase tracking-tighter opacity-50">All Manufacturers</SelectItem>
                  {[...new Set(manufacturers)].map(mf => <SelectItem key={mf} value={mf} className="rounded-2xl font-bold py-4">{mf}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Row 2: Stock Status + Reset */}
            <div className="flex flex-wrap items-center gap-6">
              <Select value={stockStatusFilter} onValueChange={(val) => { setStockStatusFilter(val); setCurrentPage(1); }}>
                <SelectTrigger className="h-14 w-full md:w-[280px] bg-white border-slate-100 rounded-full font-bold text-slate-600 shadow-sm px-8 hover:shadow-md transition-all">
                  <SelectValue placeholder="All Stock Statuses" />
                </SelectTrigger>
                <SelectContent className="rounded-[2rem] border-slate-100 shadow-2xl p-2">
                  <SelectItem value="all" className="rounded-2xl font-bold py-4 uppercase tracking-tighter opacity-50">All Stock Statuses</SelectItem>
                  <SelectItem value="in_stock" className="rounded-2xl font-bold py-4">In Stock</SelectItem>
                  <SelectItem value="out_of_stock" className="rounded-2xl font-bold py-4">Out of Stock</SelectItem>
                </SelectContent>
              </Select>

              {(categoryFilter !== "all" || stockStatusFilter !== "all" || manufacturerFilter !== "all" || searchQuery !== "" || subCategoryFilter !== "all") && (
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setSearchQuery("");
                    setCategoryFilter("all");
                    setSubCategoryFilter("all");
                    setManufacturerFilter("all");
                    setStockStatusFilter("all");
                    setCurrentPage(1);
                  }}
                  className="h-12 px-8 rounded-full font-black uppercase tracking-[0.2em] text-[10px] text-rose-500 hover:bg-rose-50 transition-all ml-auto"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Reset Filters
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Product Table Design from Image */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden mb-12">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                  <th className="py-6 px-6 w-12">
                    <Checkbox
                      checked={selectedProducts.length === products.length && products.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="py-6 px-2 w-8"></th>
                  <th className="text-left py-6 px-4">{t("admin_dashboard.name")}</th>
                  <th className="text-left py-6 px-4">{t("admin_dashboard.category")}</th>
                  <th className="text-left py-6 px-4">{t("admin_dashboard.manufacturer")}</th>
                  <th className="text-right py-6 px-4">{t("admin_dashboard.price")}</th>
                  <th className="text-center py-6 px-4">{t("admin_dashboard.stock")}</th>
                  <th className="text-right py-6 px-8">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {products.map((product) => {
                  const isExpanded = expandedRows.includes(product.id);
                  const stockColor = product.stock_quantity <= 5 ? "bg-rose-50 text-rose-600" : 
                                   product.stock_quantity <= 20 ? "bg-amber-50 text-amber-600" : 
                                   "bg-emerald-50 text-emerald-600";

                  return (
                    <tr key={product.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="py-5 px-6">
                        <Checkbox
                          checked={selectedProducts.includes(product.id)}
                          onCheckedChange={() => handleSelectProduct(product.id)}
                        />
                      </td>
                      <td className="py-5 px-2">
                         <button 
                           onClick={() => setExpandedRows(prev => isExpanded ? prev.filter(id => id !== product.id) : [...prev, product.id])}
                           className="p-1 hover:bg-white rounded-lg transition-all text-slate-300 group-hover:text-slate-900"
                         >
                           {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                         </button>
                      </td>
                      <td className="py-5 px-4 min-w-[280px]">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 rounded-full border border-slate-100 bg-white flex items-center justify-center p-1 shadow-sm overflow-hidden shrink-0 group-hover:scale-110 transition-transform">
                              {product.image_url ? (
                                <img src={product.image_url} alt="" className="w-full h-full object-contain" />
                              ) : (
                                <Package className="w-5 h-5 text-slate-200" />
                              )}
                           </div>
                           <div className="flex flex-col">
                              <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                {language === "pt" ? product.name_pt || product.name : product.name}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">ID: {product.id.split("-")[0]}</span>
                           </div>
                        </div>
                      </td>
                      <td className="py-5 px-4">
                         <span className="font-bold text-slate-600">{categories.find(c => c.id === product.category_id)?.name || "—"}</span>
                      </td>
                      <td className="py-5 px-4">
                         <span className="italic text-slate-400 font-medium">{product.manufacturer || "Generic"}</span>
                      </td>
                      <td className="py-5 px-4 text-right">
                         <span className="font-black text-slate-900 text-base">{formatPrice(product.price)}</span>
                      </td>
                      <td className="py-5 px-4">
                         <div className="flex justify-center">
                            <span className={`px-3 py-1.5 rounded-xl font-bold text-[11px] whitespace-nowrap ${stockColor}`}>
                               {product.stock_quantity} {t("admin_dashboard.in_stock")}
                            </span>
                         </div>
                      </td>
                      <td className="py-5 px-8">
                         <div className="flex justify-end gap-1">
                            <Link href={`/admin/products/edit?id=${product.id}`}>
                               <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-300 hover:text-slate-900 hover:bg-white rounded-xl shadow-sm hover:shadow-md transition-all">
                                  <Edit size={16} />
                               </Button>
                            </Link>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDelete(product.id)}
                              className="h-10 w-10 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                            >
                               <Trash2 size={16} />
                            </Button>
                         </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Clean UI Pagination Footer */}
          <div className="p-8 border-t border-slate-50 bg-slate-50/30 flex items-center justify-between">
             <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                <span>{t("common.showing")}</span>
                <span className="text-slate-900">{(currentPage - 1) * pageSize + 1}</span>
                <span>{t("common.to")}</span>
                <span className="text-slate-900">{Math.min(currentPage * pageSize, totalCount)}</span>
                <span>{t("common.of")}</span>
                <span className="text-slate-900">{totalCount}</span>
                <span>{t("common.products")}</span>
             </div>

             <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className="rounded-full h-10 px-5 font-bold text-xs uppercase tracking-wider disabled:opacity-30 hover:bg-white shadow-sm border border-slate-100"
                >
                   <ChevronLeft size={16} className="mr-2" /> {t("common.previous")}
                </Button>
                
                {Array.from({ length: Math.min(5, Math.ceil(totalCount / pageSize)) }).map((_, i) => {
                   const pageNum = i + 1;
                   const isActive = currentPage === pageNum;
                   return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-10 h-10 rounded-full font-black text-sm transition-all ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-400 hover:bg-white hover:text-slate-900 shadow-sm border border-slate-100'}`}
                      >
                         {pageNum}
                      </button>
                   )
                })}

                <Button 
                  variant="ghost" 
                  size="sm" 
                  disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="rounded-full h-10 px-5 font-bold text-xs uppercase tracking-wider disabled:opacity-30 hover:bg-white shadow-sm border border-slate-100"
                >
                   {t("common.next")} <ChevronRight size={16} className="ml-2" />
                </Button>
             </div>
          </div>
        </div>
      </div>
    </main>
  )
}

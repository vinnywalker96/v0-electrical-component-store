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

const CACHE_EXPIRY_SECONDS = 180; // Cache for 3 minutes (reduced for admin panel)

export default function AdminProductsPage() {
  const supabase = createClient()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [brandFilter, setBrandFilter] = useState("all")
  const [stockStatusFilter, setStockStatusFilter] = useState("all")
  const [categories, setCategories] = useState<string[]>([])
  const [brands, setBrands] = useState<string[]>([])
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]) // For bulk actions

  useEffect(() => {
    const fetchFilters = async () => {
      // Fetch unique categories
      const { data: catData } = await supabase.from("products").select("category").neq("category", null)
      const uniqueCategories = [...new Set((catData || []).map(p => p.category))]
      setCategories(uniqueCategories);

      // Fetch unique brands
      const { data: brandData } = await supabase.from("products").select("brand").neq("brand", null)
      const uniqueBrands = [...new Set((brandData || []).map(p => p.brand))]
      setBrands(uniqueBrands);
    }
    fetchFilters();
  }, [supabase, setCategories, setBrands]);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const cacheKey = `admin:products:search=${searchQuery}:cat=${categoryFilter}:brand=${brandFilter}:stock=${stockStatusFilter}`;
        
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
        if (brandFilter !== "all") {
          query = query.eq("brand", brandFilter)
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
          title: "Error",
          description: "Failed to fetch products.",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [supabase, searchQuery, categoryFilter, brandFilter, stockStatusFilter])

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
    if (!confirm(`Are you sure you want to delete ${selectedProducts.length} products?`)) return;

    try {
      const { error } = await supabase.from("products").delete().in("id", selectedProducts);
      if (error) throw error;
      
      setProducts(products.filter(p => !selectedProducts.includes(p.id)));
      setSelectedProducts([]);
      toast({
        title: "Success",
        description: `${selectedProducts.length} products deleted successfully!`,
      });
    } catch (error) {
      console.error("Error bulk deleting products:", error);
      toast({
        title: "Error",
        description: "Failed to delete selected products.",
        variant: "destructive"
      });
    }
  };

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this product?")) { // Using window.confirm for blocking confirmation
      return
    }

    try {
      const { error } = await supabase.from("products").delete().eq("id", id)

      if (error) throw error

      setProducts(products.filter((p) => p.id !== id))
      toast({
        title: "Success",
        description: "Product deleted successfully!",
      });
    } catch (error) {
      console.error("[v0] Error deleting product:", JSON.stringify(error, null, 2))
      toast({
        title: "Error",
        description: "Failed to delete product.",
        variant: "destructive"
      });
    }
  }

  if (loading) {
    return <div className="text-center py-12">Loading products...</div>
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Link href="/admin/dashboard" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-8">
          <ArrowLeft size={20} />
          Back to Admin Dashboard
        </Link>

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-foreground">Manage Products</h1>
          <div className="flex gap-2 items-center">
            {selectedProducts.length > 0 && (
                <Button variant="destructive" onClick={handleBulkDelete}>
                    Delete Selected ({selectedProducts.length})
                </Button>
            )}
            <Link href="/admin/products/new">
                <Button className="flex gap-2">
                <Plus size={20} />
                Add Product
                </Button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-8">
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                <Input
                    placeholder="Search by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
                        <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={brandFilter} onValueChange={setBrandFilter}>
                    <SelectTrigger>
                        <SelectValue placeholder="All Brands" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Brands</SelectItem>
                        {brands.map(brand => <SelectItem key={brand} value={brand}>{brand}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={stockStatusFilter} onValueChange={setStockStatusFilter}>
                    <SelectTrigger>
                        <SelectValue placeholder="Stock Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Stock Statuses</SelectItem>
                        <SelectItem value="in_stock">In Stock</SelectItem>
                        <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                    </SelectContent>
                </Select>
            </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {products.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-600 mb-4">No products yet</p>
                <Link href="/admin/products/new">
                  <Button>Create First Product</Button>
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
                      <th className="text-left py-3 px-4 font-semibold">Name</th>
                      <th className="text-left py-3 px-4 font-semibold">Category</th>
                      <th className="text-left py-3 px-4 font-semibold">Brand</th>
                      <th className="text-right py-3 px-4 font-semibold">Price</th>
                      <th className="text-right py-3 px-4 font-semibold">Stock</th>
                      <th className="text-center py-3 px-4 font-semibold">Actions</th>
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
                            {product.name}
                          </Link>
                        </td>
                        <td className="py-3 px-4">{product.category}</td>
                        <td className="py-3 px-4">{product.brand}</td>
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
                              Edit
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 gap-1 bg-transparent"
                            onClick={() => handleDelete(product.id)}
                          >
                            <Trash2 size={16} />
                            Delete
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

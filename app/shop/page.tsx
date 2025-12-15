"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Product } from "@/lib/types"
import { ProductCard } from "@/components/product-card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"

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

  const supabase = createClient()

  useEffect(() => {
    fetchProducts()
    fetchSellers()
  }, [])

  async function fetchProducts() {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*, seller:sellers(id, store_name, rating)")
        .order("created_at", { ascending: false })

      if (error) throw error
      setProducts(data || [])

      if (data && data.length > 0) {
        const highestPrice = Math.max(...data.map((p) => p.price || 0))
        const roundedMax = Math.ceil(highestPrice / 100) * 100 || 10000
        setMaxPrice(roundedMax)
        setPriceRange([0, roundedMax])
      }
    } catch (error) {
      console.error("Error fetching products:", error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchSellers() {
    try {
      const { data } = await supabase.from("sellers").select("id, store_name").eq("verification_status", "approved")
      setSellers(data || [])
    } catch (error) {
      console.error("Error fetching sellers:", error)
    }
  }

  const categories = useMemo(() => [...new Set(products.map((p) => p.category))], [products])
  const brands = useMemo(() => [...new Set(products.map((p) => p.brand))], [products])

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategory === "all" || product.category === selectedCategory
      const matchesBrand = selectedBrand === "all" || product.brand === selectedBrand
      const matchesSeller = selectedSeller === "all" || product.seller_id === selectedSeller
      const matchesPrice = product.price >= priceRange[0] && product.price <= priceRange[1]

      return matchesSearch && matchesCategory && matchesBrand && matchesSeller && matchesPrice
    })
  }, [products, searchQuery, selectedCategory, selectedBrand, selectedSeller, priceRange])

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Shop Electrical Components</h1>
          <p className="text-muted-foreground">Browse products from multiple sellers</p>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-lg border border-border p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Search</label>
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Category</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Brand</label>
              <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                <SelectTrigger>
                  <SelectValue placeholder="All brands" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All brands</SelectItem>
                  {brands.map((brand) => (
                    <SelectItem key={brand} value={brand}>
                      {brand}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Seller</label>
              <Select value={selectedSeller} onValueChange={setSelectedSeller}>
                <SelectTrigger>
                  <SelectValue placeholder="All sellers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sellers</SelectItem>
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
                Max Price: R{priceRange[1].toFixed(0)}
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
                Reset Filters
              </Button>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading products...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 bg-muted rounded-lg">
            <p className="text-muted-foreground text-lg">No products found matching your criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        <div className="mt-8 text-center text-sm text-muted-foreground">
          Showing {filteredProducts.length} of {products.length} products
        </div>
      </div>
    </main>
  )
}

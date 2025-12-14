"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { Product } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { PackagePlus, Edit, Trash2, ArrowLeft } from "lucide-react"
import Image from "next/image"

export default function VendorProductsPage() {
  const supabase = createClient()
  const router = useRouter()
  const { toast } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchVendorProducts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError("User not authenticated.")
        router.push("/vendor_admin/login")
        return
      }

      // In a real application, this would be an API route /api/vendor/products
      const { data, error: fetchError } = await supabase
        .from("products")
        .select("*")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false })

      if (fetchError) throw fetchError
      setProducts(data || [])
    } catch (err: any) {
      console.error("Error fetching vendor products:", err)
      setError(err.message)
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [supabase, router, toast])

  useEffect(() => {
    fetchVendorProducts()
  }, [fetchVendorProducts])

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product?")) {
      return
    }
    try {
      // In a real application, this would be an API route /api/vendor/products
      const { error: deleteError } = await supabase
        .from("products")
        .delete()
        .eq("id", productId)
      
      if (deleteError) throw deleteError

      toast({
        title: "Success",
        description: "Product deleted successfully.",
      })
      fetchVendorProducts() // Refresh list
    } catch (err: any) {
      console.error("Error deleting product:", err)
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return <div className="text-center py-12">Loading products...</div>
  }

  if (error) {
    return <div className="text-center py-12 text-destructive">Error: {error}</div>
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <Link href="/protected/vendor/dashboard" className="flex items-center gap-2 text-blue-600 hover:text-blue-700">
            <ArrowLeft size={20} />
            Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-foreground">My Products</h1>
          <Link href="/protected/vendor/products/new">
            <Button>
              <PackagePlus className="w-4 h-4 mr-2" />
              Add New Product
            </Button>
          </Link>
        </div>

        {products.length === 0 ? (
          <p className="text-foreground">You haven&apos;t added any products yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <Card key={product.id}>
                <CardHeader>
                  <CardTitle>{product.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">SKU: {product.sku || "N/A"}</p>
                </CardHeader>
                <CardContent>
                  {product.image_url && (
                    <div className="relative w-full h-48 mb-4">
                      <Image src={product.image_url} alt={product.name} layout="fill" objectFit="contain" className="rounded-md" />
                    </div>
                  )}
                  <p className="text-xl font-bold mb-2">R{product.price.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{product.description}</p>
                  <p className="text-sm">Stock: {product.stock_quantity}</p>
                  <p className="text-sm">Status: <span className={`capitalize font-semibold ${product.status === "approved" ? "text-green-600" : product.status === "pending" ? "text-orange-600" : "text-red-600"}`}>{product.status}</span></p>

                  <div className="flex gap-2 mt-4">
                    <Link href={`/protected/vendor/products/${product.id}/edit`}>
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    </Link>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteProduct(product.id)}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
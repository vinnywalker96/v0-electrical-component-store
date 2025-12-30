import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Edit, ExternalLink } from "lucide-react"
import { useCurrency } from "@/lib/context/currency-context"

export default async function SellerProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  // Get seller profile
  const { data: seller } = await supabase.from("sellers").select("*").eq("user_id", user.id).single()

  if (!seller) redirect("/seller/register")

  // Get product with seller info (ensure it belongs to this seller)
  const { data: product } = await supabase
    .from("products")
    .select(`
      *,
      sellers (
        store_name,
        is_verified
      )
    `)
    .eq("id", id)
    .eq("seller_id", seller.id)
    .single()

  if (!product) notFound()

  const productWithSeller = {
    ...product,
    seller: product.sellers,
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/seller/products">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Products
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{product.name}</h1>
          <p className="text-muted-foreground">Product Details</p>
        </div>
        <Link href={`/seller/products/${product.id}/edit`}>
          <Button>
            <Edit className="h-4 w-4 mr-2" />
            Edit Product
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Product Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Brand</label>
                  <p className="font-medium">{product.brand || "Not specified"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Category</label>
                  <p className="font-medium">{product.category}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Price</label>
                  <p className="font-medium">
                    {product.price > 0 ? `R${product.price.toFixed(2)}` : "Not set"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Stock Quantity</label>
                  <p className="font-medium">{product.stock_quantity}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Condition</label>
                  <p className="font-medium capitalize">{product.condition}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <Badge variant={seller.is_verified ? "default" : "secondary"}>
                    {seller.is_verified ? "Live" : "Pending Verification"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{product.description || "No description provided."}</p>
            </CardContent>
          </Card>

          {/* Specifications */}
          {product.specifications && (
            <Card>
              <CardHeader>
                <CardTitle>Specifications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(product.specifications).map(([key, value]) => (
                    <div key={key} className="flex justify-between py-2 border-b border-muted last:border-0">
                      <span className="font-medium capitalize">{key.replace(/_/g, " ")}</span>
                      <span>{String(value)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Technical Documents */}
          {product.technical_documents && product.technical_documents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Technical Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {product.technical_documents.map((doc: string, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={doc}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        Technical Document {index + 1}
                      </a>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Images */}
          {product.images && product.images.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Images</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {product.images.map((image: string, index: number) => (
                    <div key={index} className="aspect-square rounded-lg overflow-hidden bg-muted">
                      <img
                        src={image}
                        alt={`${product.name} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Seller Info */}
          <Card>
            <CardHeader>
              <CardTitle>Seller Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="font-medium">{productWithSeller.seller?.store_name}</p>
                <Badge variant={productWithSeller.seller?.is_verified ? "default" : "secondary"}>
                  {productWithSeller.seller?.is_verified ? "Verified Seller" : "Unverified"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
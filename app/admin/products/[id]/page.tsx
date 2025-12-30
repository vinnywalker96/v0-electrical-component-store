import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { createClient } from "@supabase/supabase-js" // Use the base client
import { ArrowLeft, Edit } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default async function AdminProductDetailPage({ params }: { params: { id: string } }) {
  if (!params || !params.id) {
    notFound();
  }
  const { id } = params
  console.log("AdminProductDetailPage params:", params);
  console.log(`Fetching product with ID: ${id}`);
  console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);

  // Use service role client to bypass RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch product first
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single()

  console.log("Fetched product data:", product);

  if (productError || !product) {
    console.error(`Error fetching product with ID ${id}:`, productError);
    notFound()
  }

  // Then, if a seller_id exists, fetch the seller
  let sellerData = null;
  if (product.seller_id) {
    const { data, error: sellerError } = await supabase
      .from("sellers")
      .select("store_name")
      .eq("id", product.seller_id)
      .single();

    if (sellerError) {
      console.warn(`[v0] Could not fetch seller for product ${id}:`, sellerError.message);
    }
    sellerData = data;
  }
  
  // Combine product with seller data
  const productWithSeller = {
      ...product,
      seller: sellerData
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Link href="/admin/products" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-8">
          <ArrowLeft size={20} />
          Back to Products
        </Link>

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-foreground">{productWithSeller.name}</h1>
          <Link href={`/admin/products/${productWithSeller.id}/edit`}>
            <Button className="flex gap-2">
              <Edit size={20} />
              Edit Product
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{productWithSeller.name}</CardTitle>
            <CardDescription>Product Details</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">SKU</p>
                <p className="text-lg font-semibold">{productWithSeller.sku}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Category</p>
                <p className="text-lg font-semibold">{productWithSeller.category}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Brand</p>
                <p className="text-lg font-semibold">{productWithSeller.brand}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Vendor</p>
                <p className="text-lg font-semibold">{productWithSeller.seller?.store_name || "N/A"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Price</p>
                <p className="text-lg font-semibold">R{productWithSeller.price.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Stock Quantity</p>
                <p className="text-lg font-semibold">{productWithSeller.stock_quantity}</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Description</p>
              <p className="text-base">{productWithSeller.description}</p>
            </div>
            {productWithSeller.image_url && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Image</p>
                <Image src={productWithSeller.image_url} alt={productWithSeller.name} width={300} height={200} className="max-w-xs h-auto rounded-md" />
              </div>
            )}
            {productWithSeller.specifications && Object.keys(productWithSeller.specifications).length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Specifications</p>
                <pre className="bg-gray-100 p-4 rounded-md text-sm whitespace-pre-wrap">
                  {JSON.stringify(productWithSeller.specifications, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

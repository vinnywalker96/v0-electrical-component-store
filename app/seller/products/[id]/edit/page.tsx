import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { EditProductButtonModal } from "@/components/edit-product-button-modal" // New import

export default async function EditSellerProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  // Get seller profile
  const { data: seller } = await supabase.from("sellers").select("*").eq("user_id", user.id).single()

  if (!seller) redirect("/seller/register")

  // Get product (ensure it belongs to this seller)
  const { data: product } = await supabase.from("products").select("*").eq("id", id).eq("seller_id", seller.id).single()

  if (!product) notFound()

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">Edit Product</h1>
      <p className="text-muted-foreground mb-8">Update your product information</p>

      <EditProductButtonModal sellerId={seller.id} storeName={seller.store_name} product={product} />
    </div>
  )
}

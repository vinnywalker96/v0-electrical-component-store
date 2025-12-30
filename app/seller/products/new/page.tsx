import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AddProductButtonModal } from "@/components/add-product-button-modal" // New import

export default async function NewSellerProductPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  // Get seller profile
  const { data: seller } = await supabase.from("sellers").select("*").eq("user_id", user.id).single()

  if (!seller) redirect("/seller/register")

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">Add New Product</h1>
      <p className="text-muted-foreground mb-8">List a new product for sale on the marketplace</p>

      {/* Render the new modal button */}
      <AddProductButtonModal sellerId={seller.id} storeName={seller.store_name} />
    </div>
  )
}

import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AdminEditProductModalButton } from "@/components/admin-edit-product-modal-button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default async function AdminEditProductPage({ params }: { params: { id:string } }) {
  if (!params || !params.id) {
    notFound();
  }
  console.log("AdminEditProductPage params:", params);
  const { id } = params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  // Optional: Fetch product here if needed for initial display,
  // but AdminEditProductModalButton fetches its own product data.
  // We primarily need to ensure an admin is accessing this page.
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
      redirect("/protected/dashboard"); // Redirect if not admin
  }


  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Link href="/admin/products" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-8">
          <ArrowLeft size={20} />
          Back to Products
      </Link>
      <h1 className="text-3xl font-bold mb-2">Edit Product</h1>
      <p className="text-muted-foreground mb-8">Update your product information</p>

      {/* Render the modal button which will fetch and display the product form */}
      <AdminEditProductModalButton productId={id} />
    </div>
  )
}

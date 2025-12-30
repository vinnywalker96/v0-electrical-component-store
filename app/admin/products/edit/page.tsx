import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AdminEditProductModalButton } from "@/components/admin-edit-product-modal-button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default async function AdminEditProductPage({ searchParams }: { searchParams: { id: string } }) {
  const { id } = await searchParams;
  if (!id) {
    notFound();
  }
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  // We primarily need to ensure an admin is accessing this page.
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
      redirect("/protected/dashboard"); // Redirect if not admin
  }


  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Link href={`/admin/products/detail?id=${id}`} className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-8">
          <ArrowLeft size={20} />
          Back to Product
      </Link>
      <h1 className="text-3xl font-bold mb-2">Edit Product</h1>
      <p className="text-muted-foreground mb-8">Update your product information</p>

      {/* Render the modal button which will fetch and display the product form */}
      <AdminEditProductModalButton productId={id} />
    </div>
  )
}

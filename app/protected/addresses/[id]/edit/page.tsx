import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AddressForm } from "@/components/address-form"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default async function EditAddressPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  // Get address (ensure it belongs to this user)
  const { data: address } = await supabase.from("user_addresses").select("*").eq("id", id).eq("user_id", user.id).single()

  if (!address) notFound()

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Link
        href="/protected/addresses"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Addresses
      </Link>

      <h1 className="text-3xl font-bold mb-2">Edit Address</h1>
      <p className="text-muted-foreground mb-8">Update your address information</p>

      <AddressForm userId={user.id} address={address} />
    </div>
  )
}

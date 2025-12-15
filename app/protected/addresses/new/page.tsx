import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AddressForm } from "@/components/address-form"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default async function NewAddressPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Link
        href="/protected/addresses"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Addresses
      </Link>

      <h1 className="text-3xl font-bold mb-2">Add New Address</h1>
      <p className="text-muted-foreground mb-8">Add a new shipping or billing address</p>

      <AddressForm userId={user.id} />
    </div>
  )
}

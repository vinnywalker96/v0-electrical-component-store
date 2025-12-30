import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Plus, MapPin } from "lucide-react"
import { DeleteAddressButton } from "@/components/delete-address-button"
import { SetDefaultAddressButton } from "@/components/set-default-address-button"

export default async function AddressesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  // Get user's addresses
  const { data: addresses } = await supabase
    .from("addresses")
    .select("*")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false })

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
 

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Addresses</h1>
          <p className="text-muted-foreground">Manage your delivery and billing addresses</p>
        </div>
        <Link href="/protected/addresses/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Address
          </Button>
        </Link>
      </div>

      {!addresses || addresses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">No addresses saved yet</p>
            <Link href="/protected/addresses/new">
              <Button>Add Your First Address</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {addresses.map((address) => (
            <Card key={address.id} className={address.is_default ? "border-primary" : ""}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    <span className="capitalize">{address.address_type} Address</span>
                    {address.is_default && (
                      <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">Default</span>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-2">{address.full_address}</p>
                <p className="text-sm text-muted-foreground">
                  {address.city}, {address.postal_code}
                </p>
                <div className="flex gap-2 mt-4">
                  <Link href={`/protected/addresses/${address.id}/edit`}>
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </Link>
                  {!address.is_default && <SetDefaultAddressButton addressId={address.id} />}
                  <DeleteAddressButton addressId={address.id} isDefault={address.is_default} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

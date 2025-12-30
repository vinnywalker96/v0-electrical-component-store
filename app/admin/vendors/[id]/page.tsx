import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/lib/supabase/server"
import { ArrowLeft, CheckCircle2, XCircle, Package, ShoppingBag, DollarSign, User, Mail, Phone, MapPin, Banknote, Star, CalendarDays } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export default async function AdminVendorDetailPage({ params }: { params: { id: string } }) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch Vendor Details first
  const { data: sellerData, error: sellerError } = await supabase
    .from("sellers")
    .select("*")
    .eq("id", id)
    .single()

  if (sellerError || !sellerData) notFound()

  // Fetch Profile data separately using user_id
  let profileData = null;
  if (sellerData.user_id) {
    const { data: fetchedProfile, error: profileFetchError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", sellerData.user_id)
      .single();

    if (profileFetchError) {
      console.warn(`[v0] Could not fetch profile for seller user ${sellerData.user_id}:`, profileFetchError.message);
    }
    profileData = fetchedProfile;
  }

  // Combine seller data with profile
  const vendorData = {
    ...sellerData,
    profile: profileData,
  };

  // Fetch Vendor's Products
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("*")
    .eq("seller_id", id)
    .order("created_at", { ascending: false })

  // Fetch Vendor's Orders
  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("*")
    .eq("seller_id", id)
    .order("created_at", { ascending: false })

  // Calculate Total Sales and Commission
  let totalSales = 0
  let totalCommission = 0
  const COMMISSION_RATE = 0.15 // 15% commission rate

  orders?.forEach(order => {
    if (order.status === "delivered" || order.payment_status === "paid") {
      totalSales += order.total_amount
      totalCommission += order.total_amount * COMMISSION_RATE
    }
  })


  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Link href="/admin/vendors" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-8">
          <ArrowLeft size={20} />
          Back to Vendor List
        </Link>

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-foreground">{vendorData.store_name}</h1>
          <Badge
            variant={
              vendorData.verification_status === "approved"
                ? "default"
                : vendorData.verification_status === "pending"
                  ? "secondary"
                  : "destructive"
            }
            className="text-lg px-3 py-1"
          >
            {vendorData.verification_status}
          </Badge>
        </div>

        {/* Vendor Details */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Vendor Information</CardTitle>
            <CardDescription>General details about the vendor and their store.</CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Store Name</p>
              <p className="text-lg font-semibold">{vendorData.store_name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Description</p>
              <p className="text-lg">{vendorData.store_description || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Contact Email</p>
              <p className="text-lg flex items-center gap-2"><Mail size={16} />{vendorData.contact_email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Contact Phone</p>
              <p className="text-lg flex items-center gap-2"><Phone size={16} />{vendorData.contact_phone || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Business Address</p>
              <p className="text-lg flex items-center gap-2"><MapPin size={16} />{vendorData.business_address || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Verification Status</p>
              <Badge
                variant={
                  vendorData.verification_status === "approved"
                    ? "default"
                    : vendorData.verification_status === "pending"
                      ? "secondary"
                      : "destructive"
                }
                className="text-base px-3 py-1"
              >
                {vendorData.verification_status}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Rating</p>
              <p className="text-lg flex items-center gap-2"><Star size={16} fill="currentColor" className="text-yellow-500" />{vendorData.rating?.toFixed(1) || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Member Since</p>
              <p className="text-lg flex items-center gap-2"><CalendarDays size={16} />{new Date(vendorData.created_at).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>

        {/* Associated User Details */}
        {vendorData.profile && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Associated User</CardTitle>
              <CardDescription>Profile details of the user managing this vendor account.</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p className="text-lg font-semibold">{vendorData.profile.first_name} {vendorData.profile.last_name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="text-lg flex items-center gap-2"><Mail size={16} />{vendorData.profile.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Role</p>
                <p className="text-lg font-semibold">{vendorData.profile.role}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Financial Overview */}
        <Card className="mb-8">
            <CardHeader>
                <CardTitle>Financial Overview</CardTitle>
                <CardDescription>Sales and commission data for this vendor.</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-6">
                <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Sales (Delivered/Paid)</p>
                    <p className="text-2xl font-bold flex items-center gap-2"><DollarSign size={20} />R{totalSales.toFixed(2)}</p>
                </div>
                <div>
                    <p className="text-sm font-medium text-muted-foreground">Estimated Total Commission</p>
                    <p className="text-2xl font-bold flex items-center gap-2"><Banknote size={20} />R{totalCommission.toFixed(2)}</p>
                </div>
                <div>
                    <p className="text-sm font-medium text-muted-foreground">Number of Products</p>
                    <p className="text-2xl font-bold flex items-center gap-2"><Package size={20} />{products?.length || 0}</p>
                </div>
            </CardContent>
        </Card>


        {/* Vendor Products */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Products ({products?.length || 0})</CardTitle>
            <CardDescription>Products listed by {vendorData.store_name}.</CardDescription>
          </CardHeader>
          <CardContent>
            {products && products.length > 0 ? (
              <div className="space-y-4">
                {products.map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {product.image_url && (
                        <Image src={product.image_url} alt={product.name} width={48} height={48} className="w-12 h-12 object-cover rounded" />
                      )}
                      <div>
                        <Link href={`/admin/products/${product.id}`} className="font-semibold hover:underline">
                          {product.name}
                        </Link>
                        <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">R{product.price.toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">Stock: {product.stock_quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No products listed by this vendor yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Vendor Orders */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Recent Orders ({orders?.length || 0})</CardTitle>
            <CardDescription>Orders fulfilled by {vendorData.store_name}.</CardDescription>
          </CardHeader>
          <CardContent>
            {orders && orders.length > 0 ? (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <Link href={`/admin/orders/${order.id}`} className="font-semibold hover:underline">
                        Order #{order.id.slice(0, 8)}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">R{order.total_amount.toFixed(2)}</p>
                      <Badge
                        variant={
                          order.status === "delivered"
                            ? "default"
                            : order.status === "pending"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No orders for this vendor yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Admin Actions (Approve/Reject - if pending) */}
        {vendorData.verification_status === "pending" && (
          <Card>
            <CardHeader>
              <CardTitle>Admin Actions</CardTitle>
              <CardDescription>Approve or reject this vendor application.</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-4">
              <Button>Approve Vendor</Button>
              <Button variant="destructive">Reject Vendor</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}

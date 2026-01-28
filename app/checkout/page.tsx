"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useCart } from "@/lib/context/cart-context"
import { useLanguage } from "@/lib/context/language-context"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Store } from "lucide-react"
import { useCurrency } from "@/lib/context/currency-context"
import { toast } from "@/hooks/use-toast"

export default function CheckoutPage() {
  const router = useRouter()
  const { items, total, tax, clearCart, loading } = useCart()
  const { t } = useLanguage()
  const supabase = createClient()
  const [isProcessing, setIsProcessing] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [savedAddresses, setSavedAddresses] = useState<any[]>([])
  const [selectedAddress, setSelectedAddress] = useState<string>("")
  const { formatPrice } = useCurrency()

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    shippingAddress: "",
    shippingCity: "",
    shippingZip: "",
    billingAddress: "",
    billingCity: "",
    billingZip: "",
    paymentMethod: "cash_on_delivery",
  })

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)

      if (user?.email) {
        setFormData((prev) => ({
          ...prev,
          email: user.email || "",
        }))

        // Fetch saved addresses
        const { data: addresses } = await supabase
          .from("addresses")
          .select("*")
          .eq("user_id", user.id)
          .order("is_default", { ascending: false })

        setSavedAddresses(addresses || [])

        // Auto-select default address
        const defaultAddress = addresses?.find((a) => a.is_default)
        if (defaultAddress) {
          setSelectedAddress(defaultAddress.id)
          setFormData((prev) => ({
            ...prev,
            shippingAddress: defaultAddress.full_address,
            shippingCity: defaultAddress.city,
            shippingZip: defaultAddress.postal_code,
          }))
        }
      }
    }

    fetchUser()
  }, [supabase, router, setFormData])

  const itemsBySeller = items.reduce(
    (acc, item) => {
      const sellerId = item.product?.seller_id || "direct"
      if (!acc[sellerId]) {
        acc[sellerId] = {
          seller: item.product?.seller,
          items: [],
        }
      }
      acc[sellerId].items.push(item)
      return acc
    },
    {} as Record<string, any>,
  )

  const handleAddressChange = (addressId: string) => {
    setSelectedAddress(addressId)
    const address = savedAddresses.find((a) => a.id === addressId)
    if (address) {
      setFormData((prev) => ({
        ...prev,
        shippingAddress: address.full_address,
        shippingCity: address.city,
        shippingZip: address.postal_code,
      }))
    }
  }

  if (loading) {
    return <div className="text-center py-12">Loading...</div>
  }

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-slate-600">{t("checkout.cart_empty")}</p>
              <Button onClick={() => router.push("/shop")} className="mt-4">
                {t("checkout.continue_shopping")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!user) {
      router.push("/auth/login")
      return
    }

    // "Please confirm order" pop-up
    if (!window.confirm("Please confirm your order details before proceeding.")) {
      return
    }

    setIsProcessing(true)

    try {
      // 1. Fetch current product stock for all items in the cart
      const productIds = items.map(item => item.product_id);
      const { data: productsInDb, error: productsError } = await supabase
        .from("products")
        .select("id, stock_quantity, name")
        .in("id", productIds);

      if (productsError) throw productsError;

      // Map products by ID for easy lookup
      const productStockMap = new Map(productsInDb.map(p => [p.id, p]));

      // 2. Check stock availability
      for (const item of items) {
        const product = productStockMap.get(item.product_id);
        if (!product || product.stock_quantity < item.quantity) {
          toast({
            title: "Stock Error",
            description: `Insufficient stock for ${product?.name || "a product"}. Available: ${product?.stock_quantity || 0}, Requested: ${item.quantity}`,
            variant: "destructive"
          });
          setIsProcessing(false);
          return;
        }
      }

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          status: "pending",
          payment_status: "unpaid",
          total_amount: total,
          tax_amount: tax,
          shipping_address: `${formData.shippingAddress}, ${formData.shippingCity}, ${formData.shippingZip}`,
          billing_address: `${formData.billingAddress}, ${formData.billingCity}, ${formData.billingZip}`,
          payment_method: formData.paymentMethod,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.product?.price || 0,
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);

      if (itemsError) throw itemsError;

      // 3. Decrement stock for each ordered product
      const stockUpdatePromises = items.map(item => {
        const product = productStockMap.get(item.product_id);
        if (product) {
          return supabase
            .from("products")
            .update({ stock_quantity: product.stock_quantity - item.quantity })
            .eq("id", item.product_id);
        }
        return Promise.resolve(null); // Should not happen due to prior stock check
      });

      const stockUpdateResults = await Promise.all(stockUpdatePromises);
      stockUpdateResults.forEach(result => {
        if (result?.error) {
          console.error("Error decrementing stock:", result.error);
          // Potentially revert order creation or flag for manual review
        }
      });

      try {
        await fetch("/api/emails/order-confirmation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: order.id,
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            total,
            items: items.map((item) => ({
              name: item.product?.name || "Product",
              quantity: item.quantity,
              price: item.product?.price || 0,
            })),
            paymentMethod: formData.paymentMethod,
            reference: order.id,
          }),
        });
      } catch (error) {
        console.error("[v0] Error sending confirmation email:", error);
      }

      // Notify admins about the new order
      try {
        await fetch("/api/admin/notify-new-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: order.id,
            totalAmount: order.total_amount,
            customerName: `${formData.firstName} ${formData.lastName}`,
            customerEmail: formData.email,
            items: items.map((item) => ({
              name: item.product?.name || "Product",
              quantity: item.quantity,
              unitPrice: item.product?.price || 0,
            })),
          }),
        });
      } catch (notificationError) {
        console.warn("[v0] Failed to send new order notification to admins:", notificationError);
        // Do not block order completion if notification fails
      }

      await clearCart()
      toast({
        title: "Order Successful",
        description: `Your order #${order.id.slice(0, 8)} has been placed!`,
      });
      router.push(`/order-confirmation/${order.id}`)
    } catch (error) {
      console.error("[v0] Checkout error:", error)
      toast({
        title: "Checkout Error",
        description: "An error occurred during checkout. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-8">{t("checkout.title")}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle>{t("checkout.personal_info")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    placeholder={t("checkout.first_name")}
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                  />
                  <Input
                    placeholder={t("checkout.last_name")}
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                  />
                </div>
                <Input
                  placeholder={t("checkout.email")}
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
                <Input
                  placeholder={t("checkout.phone")}
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </CardContent>
            </Card>

            {/* Shipping Address */}
            <Card>
              <CardHeader>
                <CardTitle>{t("checkout.shipping_address")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {savedAddresses.length > 0 && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Select Saved Address</label>
                    <Select value={selectedAddress} onValueChange={handleAddressChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose an address" />
                      </SelectTrigger>
                      <SelectContent>
                        {savedAddresses.map((addr) => (
                          <SelectItem key={addr.id} value={addr.id}>
                            {addr.full_address.substring(0, 50)}... ({addr.city})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Textarea
                  placeholder={t("checkout.street_address")}
                  value={formData.shippingAddress}
                  onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })}
                  required
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    placeholder={t("checkout.city")}
                    value={formData.shippingCity}
                    onChange={(e) => setFormData({ ...formData, shippingCity: e.target.value })}
                    required
                  />
                  <Input
                    placeholder={t("checkout.zip_code")}
                    value={formData.shippingZip}
                    onChange={(e) => setFormData({ ...formData, shippingZip: e.target.value })}
                    required
                  />
                </div>
              </CardContent>
            </Card>

            {/* Billing Address */}
            <Card>
              <CardHeader>
                <CardTitle>{t("checkout.billing_address")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder={t("checkout.street_address")}
                  value={formData.billingAddress}
                  onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
                  required
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    placeholder={t("checkout.city")}
                    value={formData.billingCity}
                    onChange={(e) => setFormData({ ...formData, billingCity: e.target.value })}
                    required
                  />
                  <Input
                    placeholder={t("checkout.zip_code")}
                    value={formData.billingZip}
                    onChange={(e) => setFormData({ ...formData, billingZip: e.target.value })}
                    required
                  />
                </div>
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle>{t("checkout.payment_method")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">{t("checkout.bank_transfer")}</SelectItem>
                    <SelectItem value="cash_on_delivery">{t("checkout.cash_on_delivery")}</SelectItem>
                  </SelectContent>
                </Select>

                {formData.paymentMethod === "bank_transfer" && (
                  <div className="p-4 bg-blue-50 rounded text-sm text-slate-700">
                    <p className="font-semibold mb-2">{t("checkout.bank_transfer_instructions")}</p>
                    <p>{t("checkout.receive_bank_details")}</p>
                  </div>
                )}

                {formData.paymentMethod === "cash_on_delivery" && (
                  <div className="p-4 bg-blue-50 rounded text-sm text-slate-700">
                    <p className="font-semibold mb-2">{t("checkout.cash_on_delivery_instructions")}</p>
                    <p>{t("checkout.pay_delivery_driver")}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Button type="submit" disabled={isProcessing} size="lg" className="w-full">
              {isProcessing ? t("checkout.processing") : t("checkout.complete_order")}
            </Button>
          </form>

          {/* Order Summary */}
          <div>
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle>{t("checkout.order_summary")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {Object.entries(itemsBySeller).map(([sellerId, data]) => (
                    <div key={sellerId} className="border-b pb-3">
                      {data.seller && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                          <Store className="h-3 w-3" />
                          <span className="font-semibold">{data.seller.store_name}</span>
                        </div>
                      )}
                      {data.items.map((item: any) => (
                        <div key={item.id} className="text-sm flex justify-between ml-4 mb-1">
                          <span>
                            {item.product?.name} x{item.quantity}
                          </span>
                          <span className="font-medium">
                            {formatPrice((item.product?.price || 0) * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">{t("checkout.subtotal")}</span>
                    <span>{formatPrice(total - tax)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">{t("checkout.tax")}</span>
                    <span>{formatPrice(tax)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>{t("checkout.total")}</span>
                    <span className="text-blue-600">{formatPrice(total)}</span>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 rounded text-xs text-slate-600">
                  <p className="font-semibold mb-1">{t("checkout.secure_checkout")}</p>
                  <p>{t("checkout.order_info_encrypted")}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  )
}

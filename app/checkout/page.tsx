"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
// Removed: import { useCart } from "@/lib/context/cart-context"
// Removed: import { useLanguage } from "@/lib/context/language-context"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

import { useSelector, useDispatch } from 'react-redux';
import { selectCartItems, selectCartTotal, selectCartTax, selectCartLoading, clearCart } from '@/lib/store/cartSlice';
import { selectT } from '@/lib/store/languageSlice';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckoutFormSchema } from "@/lib/schemas";
import type { z } from 'zod';

type CheckoutFormInputs = z.infer<typeof CheckoutFormSchema>;

export default function CheckoutPage() {
  const router = useRouter()
  const dispatch = useDispatch();

  const items = useSelector(selectCartItems);
  const total = useSelector(selectCartTotal);
  const tax = useSelector(selectCartTax);
  const cartLoading = useSelector(selectCartLoading); // Renamed to avoid conflict
  const t = useSelector(selectT);
  const supabase = createClient(); // Keep for user auth check

  const [user, setUser] = useState<any>(null); // Keep local for now, can be moved to auth slice later

  const { register, handleSubmit, setValue, getValues, formState: { errors, isSubmitting } } = useForm<CheckoutFormInputs>({
    resolver: zodResolver(CheckoutFormSchema),
    defaultValues: {
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
      paymentMethod: "bank_transfer",
    }
  });

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)

      if (user?.email) {
        setValue("email", user.email);
      }
    }

    fetchUser()
  }, [supabase.auth, setValue]);

  if (cartLoading || isSubmitting) { // Use cartLoading for cart items, isSubmitting for form submission
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

  const onSubmit = async (data: CheckoutFormInputs) => {
    if (!user) {
      router.push("/auth/login")
      return
    }

    // isSubmitting from useForm takes care of processing state
    try {
      const checkoutPayload = {
        formData: data, // Use data from react-hook-form
        cartItems: items, // Pass cart items from Redux
        total, // From Redux
        tax, // From Redux
      }

      const response = await fetch("/api/orders/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(checkoutPayload),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to create order")
      }

      const { orderId } = result;

      // Send confirmation email after order is successfully created
      try {
        await fetch("/api/emails/order-confirmation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: orderId, // Use orderId from the API response
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            total,
            items: items.map((item) => ({
              name: item.product?.name || "Product",
              quantity: item.quantity,
              price: item.product?.price || 0,
            })),
            paymentMethod: data.paymentMethod,
          }),
        })
      } catch (error) {
        console.error("[v0] Error sending confirmation email:", error)
      }

      await dispatch(clearCart() as any); // Use Redux clearCart thunk
      router.push(`/order-confirmation/${orderId}`) // Use orderId from the API response
    } catch (error: any) {
      console.error("[v0] Checkout error:", error)
      alert(error.message || "An error occurred during checkout. Please try again.")
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-foreground mb-8">{t("checkout.title")}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle>{t("checkout.personal_info")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder={t("checkout.first_name")}
                    {...register("firstName")}
                  />
                  {errors.firstName && <p className="text-red-500 text-sm">{errors.firstName.message}</p>}
                  <Input
                    placeholder={t("checkout.last_name")}
                    {...register("lastName")}
                  />
                  {errors.lastName && <p className="text-red-500 text-sm">{errors.lastName.message}</p>}
                </div>
                <Input
                  placeholder={t("checkout.email")}
                  type="email"
                  {...register("email")}
                />
                {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
                <Input
                  placeholder={t("checkout.phone")}
                  {...register("phone")}
                />
                {errors.phone && <p className="text-red-500 text-sm">{errors.phone.message}</p>}
              </CardContent>
            </Card>

            {/* Shipping Address */}
            <Card>
              <CardHeader>
                <CardTitle>{t("checkout.shipping_address")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder={t("checkout.street_address")}
                  {...register("shippingAddress")}
                />
                {errors.shippingAddress && <p className="text-red-500 text-sm">{errors.shippingAddress.message}</p>}
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder={t("checkout.city")}
                    {...register("shippingCity")}
                  />
                  {errors.shippingCity && <p className="text-red-500 text-sm">{errors.shippingCity.message}</p>}
                  <Input
                    placeholder={t("checkout.zip_code")}
                    {...register("shippingZip")}
                  />
                  {errors.shippingZip && <p className="text-red-500 text-sm">{errors.shippingZip.message}</p>}
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
                  {...register("billingAddress")}
                />
                {errors.billingAddress && <p className="text-red-500 text-sm">{errors.billingAddress.message}</p>}
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder={t("checkout.city")}
                    {...register("billingCity")}
                  />
                  {errors.billingCity && <p className="text-red-500 text-sm">{errors.billingCity.message}</p>}
                  <Input
                    placeholder={t("checkout.zip_code")}
                    {...register("billingZip")}
                  />
                  {errors.billingZip && <p className="text-red-500 text-sm">{errors.billingZip.message}</p>}
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
                  value={getValues("paymentMethod")}
                  onValueChange={(value) => setValue("paymentMethod", value as CheckoutFormInputs["paymentMethod"])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">{t("checkout.bank_transfer")}</SelectItem>
                    <SelectItem value="cash_on_delivery">{t("checkout.cash_on_delivery")}</SelectItem>
                    <SelectItem value="card">{t("checkout.credit_card")}</SelectItem>
                  </SelectContent>
                </Select>

                {getValues("paymentMethod") === "bank_transfer" && (
                  <div className="p-4 bg-blue-50 rounded text-sm text-slate-700">
                    <p className="font-semibold mb-2">{t("checkout.bank_transfer_instructions")}</p>
                    <p>{t("checkout.receive_bank_details")}</p>
                  </div>
                )}

                {getValues("paymentMethod") === "cash_on_delivery" && (
                  <div className="p-4 bg-blue-50 rounded text-sm text-slate-700">
                    <p className="font-semibold mb-2">{t("checkout.cash_on_delivery_instructions")}</p>
                    <p>{t("checkout.pay_delivery_driver")}</p>
                  </div>
                )}

                {getValues("paymentMethod") === "card" && (
                  <div className="p-4 bg-yellow-50 rounded text-sm text-slate-700">
                    <p>{t("checkout.card_payment_coming_soon")}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Button
              type="submit"
              disabled={isSubmitting || getValues("paymentMethod") === "card"}
              size="lg"
              className="w-full"
            >
              {isSubmitting ? t("checkout.processing") : t("checkout.complete_order")}
            </Button>
          </form>

          {/* Order Summary */}
          <div>
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle>{t("checkout.order_summary")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {items.map((item) => (
                    <div key={item.id} className="text-sm flex justify-between">
                      <span>
                        {item.product?.name} x{item.quantity}
                      </span>
                      <span className="font-medium">${((item.product?.price || 0) * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">{t("checkout.subtotal")}</span>
                    <span>${(total - tax).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">{t("checkout.tax")}</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>{t("checkout.total")}</span>
                    <span className="text-blue-600">${total.toFixed(2)}</span>
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

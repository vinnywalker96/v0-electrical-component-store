"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Plus, Minus } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface Product {
  id: string
  name: string
  price: number
  stock_quantity: number
  seller_id: string
  seller?: {
    store_name: string
  }
}

interface User {
  id: string
  email: string
  first_name?: string
  last_name?: string
}

interface OrderItem {
  product_id: string
  quantity: number
  unit_price: number
}

export default function AdminCreateOrderPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [sellers, setSellers] = useState<any[]>([])

  const [formData, setFormData] = useState({
    user_id: "",
    seller_id: "",
    shipping_address: "",
    billing_address: "",
    payment_method: "cash_on_delivery",
    currency_code: "ZAR",
    order_items: [] as OrderItem[],
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch products
        const { data: productsData } = await supabase
          .from("products")
          .select("*, sellers(store_name)")
          .eq("stock_quantity", 0, { negate: true }) // Only products with stock
          .order("name")

        // Fetch users
        const { data: usersData } = await supabase
          .from("profiles")
          .select("id, email, first_name, last_name")
          .order("email")

        // Fetch sellers
        const { data: sellersData } = await supabase
          .from("sellers")
          .select("id, store_name, user_id")
          .order("store_name")

        setProducts(productsData || [])
        setUsers(usersData || [])
        setSellers(sellersData || [])
      } catch (error) {
        console.error("Error fetching data:", error)
        toast({
          title: "Error",
          description: "Failed to load data",
          variant: "destructive"
        })
      }
    }

    fetchData()
  }, [supabase])

  const addOrderItem = () => {
    setFormData({
      ...formData,
      order_items: [...formData.order_items, { product_id: "", quantity: 1, unit_price: 0 }]
    })
  }

  const updateOrderItem = (index: number, field: string, value: any) => {
    const updatedItems = [...formData.order_items]
    updatedItems[index] = { ...updatedItems[index], [field]: value }

    // Auto-fill price when product is selected
    if (field === "product_id") {
      const product = products.find(p => p.id === value)
      if (product) {
        updatedItems[index].unit_price = product.price
      }
    }

    setFormData({ ...formData, order_items: updatedItems })
  }

  const removeOrderItem = (index: number) => {
    setFormData({
      ...formData,
      order_items: formData.order_items.filter((_, i) => i !== index)
    })
  }

  const calculateTotal = () => {
    return formData.order_items.reduce((total, item) => total + (item.unit_price * item.quantity), 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.order_items.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one product to the order",
        variant: "destructive"
      })
      return
    }

    if (!formData.user_id || !formData.shipping_address || !formData.billing_address) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    setLoading(true)

    try {
      // Create the order
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: formData.user_id,
          seller_id: formData.seller_id || null,
          status: "pending",
          total_amount: calculateTotal(),
          tax_amount: 0,
          delivery_fee: 0,
          shipping_address: formData.shipping_address,
          billing_address: formData.billing_address,
          payment_method: formData.payment_method,
          payment_status: "unpaid",
          currency_code: formData.currency_code,
          requires_courier: false,
        })
        .select()
        .single()

      if (orderError) throw orderError

      // Create order items
      const orderItemsData = formData.order_items.map(item => ({
        order_id: orderData.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        commission_amount: 0, // Will be calculated later
      }))

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItemsData)

      if (itemsError) throw itemsError

      toast({
        title: "Success",
        description: "Order created successfully",
      })

      router.push("/admin/orders")
    } catch (error: any) {
      console.error("Error creating order:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create order",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/admin/orders" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-8">
          <ArrowLeft size={20} />
          Back to Orders
        </Link>

        <h1 className="text-4xl font-bold text-foreground mb-8">Create New Order</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Customer *</label>
                <Select value={formData.user_id} onValueChange={(value) => setFormData({ ...formData, user_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.first_name} {user.last_name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Shipping Address *</label>
                <Textarea
                  value={formData.shipping_address}
                  onChange={(e) => setFormData({ ...formData, shipping_address: e.target.value })}
                  placeholder="Full shipping address"
                  rows={3}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Billing Address *</label>
                <Textarea
                  value={formData.billing_address}
                  onChange={(e) => setFormData({ ...formData, billing_address: e.target.value })}
                  placeholder="Full billing address"
                  rows={3}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.order_items.map((item, index) => (
                <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-foreground mb-2 block">Product</label>
                    <Select
                      value={item.product_id}
                      onValueChange={(value) => updateOrderItem(index, "product_id", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} - R{product.price} ({product.seller?.store_name})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-24">
                    <label className="text-sm font-medium text-foreground mb-2 block">Qty</label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateOrderItem(index, "quantity", Number.parseInt(e.target.value) || 1)}
                    />
                  </div>

                  <div className="w-32">
                    <label className="text-sm font-medium text-foreground mb-2 block">Price</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => updateOrderItem(index, "unit_price", Number.parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="pt-6">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeOrderItem(index)}
                    >
                      <Minus size={16} />
                    </Button>
                  </div>
                </div>
              ))}

              <Button type="button" variant="outline" onClick={addOrderItem}>
                <Plus size={16} className="mr-2" />
                Add Product
              </Button>

              <div className="text-right text-lg font-semibold">
                Total: R{calculateTotal().toFixed(2)}
              </div>
            </CardContent>
          </Card>

          {/* Order Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Order Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Payment Method</label>
                  <Select
                    value={formData.payment_method}
                    onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash_on_delivery">Cash on Delivery</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Currency</label>
                  <Select
                    value={formData.currency_code}
                    onValueChange={(value) => setFormData({ ...formData, currency_code: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ZAR">South African Rand (ZAR)</SelectItem>
                      <SelectItem value="USD">US Dollar (USD)</SelectItem>
                      <SelectItem value="EUR">Euro (EUR)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Order"}
            </Button>
            <Link href="/admin/orders">
              <Button variant="outline">Cancel</Button>
            </Link>
          </div>
        </form>
      </div>
    </main>
  )
}

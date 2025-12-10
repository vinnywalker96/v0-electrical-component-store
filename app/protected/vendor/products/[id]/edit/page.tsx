"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import type { Product } from "@/lib/types"

const CATEGORIES = [
  "Resistors",
  "LEDs",
  "Capacitors",
  "Wires & Connectors",
  "Breadboards",
  "Microcontrollers",
  "Switches",
  "Diodes",
  "PCBs",
  "Cables",
  "Potentiometers",
  "Relays",
  "Circuit Boards",
  "Cables & Wires",
]

interface EditProductFormData {
  name: string;
  description: string;
  category: string;
  brand: string;
  price: number;
  stock_quantity: number;
  image_urls: string;
  specifications: string;
}

export default function VendorEditProductPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<EditProductFormData>({
    name: "",
    description: "",
    category: "Resistors",
    brand: "Generic",
    price: 0,
    stock_quantity: 0,
    image_urls: "", // Changed to handle multiple URLs as a comma-separated string
    specifications: "",
  })

  useEffect(() => {
    async function fetchProduct() {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          throw new Error("User not authenticated.");
        }

        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("id", params.id)
          .eq("seller_id", user.id) // Ensure vendor can only edit their own products
          .single();

        if (error) throw error;
        if (!data) {
          setError("Product not found or you don't have permission to edit it.");
          setLoading(false);
          return;
        }

        setFormData({
          name: data.name,
          description: data.description || "",
          category: data.category,
          brand: data.brand || "",
          price: data.price,
          stock_quantity: data.stock_quantity,
          image_urls: data.image_urls ? data.image_urls.join(', ') : "", // Join array to string for textarea
          specifications: data.specifications ? JSON.stringify(data.specifications, null, 2) : "",
        });
      } catch (err: any) {
        console.error("[v0] Error fetching product:", err);
        setError(err.message || "Failed to load product data.");
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [params.id, supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!formData.name.trim()) {
      setError("Product name is required")
      return
    }

    if (formData.price <= 0) {
      setError("Price must be greater than 0")
      return
    }

    setSaving(true)

    try {
      const specs = formData.specifications ? JSON.parse(formData.specifications) : {}
      const imageUrlsArray = formData.image_urls.split(',').map(url => url.trim()).filter(url => url !== '');

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("User not authenticated.");
      }

      const { error: updateError } = await supabase
        .from("products")
        .update({
          name: formData.name,
          description: formData.description,
          category: formData.category,
          brand: formData.brand,
          price: Number.parseFloat(formData.price.toString()),
          stock_quantity: Number.parseInt(formData.stock_quantity.toString()),
          image_urls: imageUrlsArray, // Update to image_urls array
          specifications: specs,
          // seller_id, status, is_featured are not updated by vendor
        })
        .eq("id", params.id)
        .eq("seller_id", user.id); // Ensure vendor can only update their own products

      if (updateError) throw updateError

      router.push("/protected/vendor/products")
    } catch (err: any) {
      console.error("[v0] Error updating product:", err)
      setError(err.message || "Failed to update product")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-xl text-foreground">Loading product...</p>
      </main>
    )
  }

  if (error && !loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-red-600 mb-4">{error}</p>
          <Link href="/protected/vendor/products">
            <Button>Back to My Products</Button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link href="/protected/vendor/products" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-8">
          <ArrowLeft size={20} />
          Back to My Products
        </Link>

        <h1 className="text-4xl font-bold text-foreground mb-8">Edit Product</h1>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>}

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Product Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Resistor 1K Ohm"
                  required
                  disabled={saving}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Product description..."
                  rows={4}
                  disabled={saving}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    disabled={saving}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Brand</label>
                  <Input
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="e.g., Generic, Arduino"
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Price ($) *</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number.parseFloat(e.target.value) })}
                    placeholder="0.00"
                    required
                    disabled={saving}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Stock Quantity</label>
                  <Input
                    type="number"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: Number.parseInt(e.target.value) })}
                    placeholder="0"
                    disabled={saving}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Image URLs (comma-separated)</label>
                <Textarea
                  value={formData.image_urls}
                  onChange={(e) => setFormData({ ...formData, image_urls: e.target.value })}
                  placeholder="e.g., https://example.com/img1.jpg, https://example.com/img2.png"
                  rows={3}
                  disabled={saving}
                />
                <p className="text-xs text-slate-600 mt-1">Enter multiple URLs separated by commas</p>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Specifications (JSON)</label>
                <Textarea
                  value={formData.specifications}
                  onChange={(e) => setFormData({ ...formData, specifications: e.target.value })}
                  placeholder='{"key": "value", "color": "red"}'
                  rows={4}
                  disabled={saving}
                />
                <p className="text-xs text-slate-600 mt-1">Optional: Enter specifications as valid JSON</p>
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={saving}>
                  {saving ? "Updating..." : "Update Product"}
                </Button>
                <Link href="/protected/vendor/products">
                  <Button variant="outline" disabled={saving}>Cancel</Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

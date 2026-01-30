"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Globe } from "lucide-react"
import { ImageUploadField } from "@/components/image-upload-field" // Import ImageUploadField

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

export default function NewProductPage() {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined) // New state for image URL

  const [formData, setFormData] = useState({
    name: "",
    name_pt: "",
    description: "",
    description_pt: "",
    category: "Resistors",
    manufacturer: "Generic",
    price: 0,
    stock_quantity: 0,
    specifications: "",
  })

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

      const { error: insertError } = await supabase.from("products").insert({
        name: formData.name,
        name_pt: formData.name_pt,
        description: formData.description,
        description_pt: formData.description_pt,
        category: formData.category,
        manufacturer: formData.manufacturer,
        price: Number.parseFloat(formData.price.toString()),
        stock_quantity: Number.parseInt(formData.stock_quantity.toString()),
        specifications: specs,
        image_url: imageUrl, // Include image_url in the insert
      })

      if (insertError) throw insertError

      router.push("/admin/products")
    } catch (err: any) {
      console.error("[v0] Error creating product:", err)
      setError(err.message || "Failed to create product")
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link href="/admin/products" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-8">
          <ArrowLeft size={20} />
          Back to Products
        </Link>

        <h1 className="text-4xl font-bold text-foreground mb-8">Add New Product</h1>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>}

              {/* Image Upload Field */}
              <ImageUploadField
                label="Product Image"
                folder="products"
                currentImageUrl={imageUrl}
                onUploadComplete={(result) => setImageUrl(result.url)}
                onRemove={() => setImageUrl(undefined)}
              />

              <Tabs defaultValue="en" className="w-full">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-foreground block">Product Content</label>
                  <TabsList>
                    <TabsTrigger value="en" className="flex gap-2 items-center text-xs">
                      <Globe className="h-3 w-3" /> English
                    </TabsTrigger>
                    <TabsTrigger value="pt" className="flex gap-2 items-center text-xs">
                      <Globe className="h-3 w-3" /> Portuguese
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="en" className="space-y-4 pt-4 border-t">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Product Name *</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Resistor 1K Ohm"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Description</label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Product description in English..."
                      rows={4}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="pt" className="space-y-4 pt-4 border-t">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Product Name (Portuguese)</label>
                    <Input
                      value={formData.name_pt}
                      onChange={(e) => setFormData({ ...formData, name_pt: e.target.value })}
                      placeholder="ex: Resistor 1K Ohm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Description (Portuguese)</label>
                    <Textarea
                      value={formData.description_pt}
                      onChange={(e) => setFormData({ ...formData, description_pt: e.target.value })}
                      placeholder="Descrição do produto em português..."
                      rows={4}
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Manufacturer</label>
                  <Input
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    placeholder="e.g., Generic, Arduino"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Price ($) *</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.price || ""}
                    onChange={(e) => {
                      const value = e.target.value
                      setFormData({ ...formData, price: value === "" ? 0 : Number.parseFloat(value) || 0 })
                    }}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Stock Quantity</label>
                  <Input
                    type="number"
                    value={formData.stock_quantity || ""}
                    onChange={(e) => {
                      const value = e.target.value
                      setFormData({ ...formData, stock_quantity: value === "" ? 0 : Number.parseInt(value) || 0 })
                    }}
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Specifications (JSON)</label>
                <Textarea
                  value={formData.specifications}
                  onChange={(e) => setFormData({ ...formData, specifications: e.target.value })}
                  placeholder='{"key": "value", "color": "red"}'
                  rows={4}
                />
                <p className="text-xs text-slate-600 mt-1">Optional: Enter specifications as valid JSON</p>
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={saving}>
                  {saving ? "Creating..." : "Create Product"}
                </Button>
                <Link href="/admin/products">
                  <Button variant="outline">Cancel</Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

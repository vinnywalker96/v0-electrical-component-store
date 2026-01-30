"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, Globe } from "lucide-react"
import type { Product } from "@/lib/types"
import { toast } from "@/hooks/use-toast"
import { ImageUploadField } from "@/components/image-upload-field"
import { DocumentUploadField } from "@/components/document-upload-field"

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
  "Transformers",
  "Sensors",
  "Actuators",
  "Power Supplies",
  "Tools",
  "Other",
]

interface SellerProductFormProps {
  sellerId: string
  storeName: string
  product?: Product
  onSuccess?: () => void
}

export function SellerProductForm({ sellerId, storeName, product, onSuccess }: SellerProductFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)


  const [formData, setFormData] = useState({
    name: product?.name || "",
    name_pt: product?.name_pt || "",
    description: product?.description || "",
    description_pt: product?.description_pt || "",
    sku: product?.sku || "", // Added SKU field
    category: product?.category || "Resistors",
    manufacturer: product?.manufacturer || "",
    price: product?.price || 0,
    stock_quantity: product?.stock_quantity || 0,
    image_url: product?.image_url || "",
    specifications: product?.specifications ? JSON.stringify(product.specifications, null, 2) : "",
    technical_documents: product?.technical_documents || [], // Updated to array
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    // setError("") // No longer needed, toast handles errors

    try {
      const supabase = createClient()

      // Parse specifications
      let specs = {}
      if (formData.specifications.trim()) {
        try {
          specs = JSON.parse(formData.specifications)
        } catch {
          throw new Error("Invalid JSON in specifications field")
        }
      }

      const productData = {
        name: formData.name,
        name_pt: formData.name_pt,
        description: formData.description,
        description_pt: formData.description_pt,
        sku: formData.sku, // Added SKU to productData
        category: formData.category,
        manufacturer: formData.manufacturer,
        price: Number.parseFloat(formData.price.toString()) || 0,
        stock_quantity: Number.parseInt(formData.stock_quantity.toString()) || 0,
        image_url: formData.image_url || null,
        specifications: specs,
        technical_documents: formData.technical_documents, // Already an array
        seller_id: sellerId,
      }

      if (product) {
        // Update existing product
        const { error: updateError } = await supabase.from("products").update(productData).eq("id", product.id)

        if (updateError) throw updateError
        toast({
          title: "Success",
          description: "Product updated successfully!",
        });
      } else {
        // Create new product
        const { error: insertError } = await supabase.from("products").insert(productData)

        if (insertError) throw insertError
        toast({
          title: "Success",
          description: "Product added successfully!",
        });
      }

      onSuccess?.() // Call onSuccess after successful operation
      // router.push("/seller/products") // No longer push, parent handles closing modal and potentially refreshing
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to save product",
        variant: "destructive"
      });
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="en" className="w-full">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-base font-semibold">Product Content</Label>
              <TabsList>
                <TabsTrigger value="en" className="flex gap-2 items-center">
                  <Globe className="h-4 w-4" /> English
                </TabsTrigger>
                <TabsTrigger value="pt" className="flex gap-2 items-center">
                  <Globe className="h-4 w-4" /> Portuguese
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="en" className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., 1K Ohm Resistor Pack"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your product in English..."
                  rows={4}
                />
              </div>
            </TabsContent>

            <TabsContent value="pt" className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="name_pt">Product Name (Portuguese)</Label>
                <Input
                  id="name_pt"
                  value={formData.name_pt}
                  onChange={(e) => setFormData({ ...formData, name_pt: e.target.value })}
                  placeholder="ex: Pacote de Resistores de 1K Ohm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description_pt">Description (Portuguese)</Label>
                <Textarea
                  id="description_pt"
                  value={formData.description_pt}
                  onChange={(e) => setFormData({ ...formData, description_pt: e.target.value })}
                  placeholder="Descreva seu produto em português..."
                  rows={4}
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU *</Label>
              <Input
                id="sku"
                required
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="e.g., RES1000K-01"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor</Label>
              <Input
                id="vendor"
                readOnly
                value={storeName}
                className="bg-gray-100 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="manufacturer">Manufacturer</Label>
              <Input
                id="manufacturer"
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                placeholder="e.g., Generic, Arduino"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price (R)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number.parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock">Stock Quantity *</Label>
              <Input
                id="stock"
                type="number"
                required
                value={formData.stock_quantity}
                onChange={(e) => setFormData({ ...formData, stock_quantity: Number.parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Product Image</Label>
            <ImageUploadField
              label="Upload Product Image"
              folder={`seller-${sellerId}`}
              currentImageUrl={formData.image_url}
              onUploadComplete={(result) => {
                setFormData({ ...formData, image_url: result.url })
              }}
              onRemove={() => {
                setFormData({ ...formData, image_url: "" })
              }}
            />
            {formData.image_url && (
              <p className="text-xs text-muted-foreground">Current image: {formData.image_url}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="specifications">Specifications (JSON format)</Label>
            <Textarea
              id="specifications"
              value={formData.specifications}
              onChange={(e) => setFormData({ ...formData, specifications: e.target.value })}
              placeholder='{"voltage": "5V", "current": "20mA"}'
              rows={4}
            />
            <p className="text-xs text-muted-foreground">Optional: Enter product specifications as valid JSON</p>
          </div>

          <div className="space-y-2">
            <DocumentUploadField
              label="Technical Documents"
              bucket="products" // Assuming technical documents also go into the 'products' bucket
              folder={`seller-${sellerId}/documents`} // Specific folder for documents
              currentDocumentUrls={formData.technical_documents}
              onUploadComplete={(urls) => {
                setFormData({ ...formData, technical_documents: urls })
              }}
            />
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : product ? "Update Product" : "Create Product"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push("/seller/products")}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

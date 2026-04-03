"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Globe } from "lucide-react"
import { ImageUploadField } from "@/components/image-upload-field" 

import { Category } from "@/lib/types"
import { useMemo } from "react"

export function AdminEditProductForm({ productId }: { productId: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined)

  const [formData, setFormData] = useState({
    name: "",
    name_pt: "",
    description: "",
    description_pt: "",
    manufacturer: "Generic",
    price: 0,
    currency: "ZAR",
    stock_quantity: 0,
    specifications: "",
  })

  const [dbCategories, setDbCategories] = useState<Category[]>([])
  const [selectedMainCategoryId, setSelectedMainCategoryId] = useState<string>("")
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState<string>("")

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name", { ascending: true })
      
      if (!error && data) {
        setDbCategories(data as Category[])
      }
    }
    fetchCategories()
  }, [supabase])

  const mainCategories = useMemo(() => dbCategories.filter((c) => !c.parent_id), [dbCategories])
  const subCategories = useMemo(() => {
    if (!selectedMainCategoryId) return []
    return dbCategories.filter((c) => c.parent_id === selectedMainCategoryId)
  }, [dbCategories, selectedMainCategoryId])

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("id", productId)
          .single()

        if (error) throw error

        if (data) {
          setFormData({
            name: data.name || "",
            name_pt: data.name_pt || "",
            description: data.description || "",
            description_pt: data.description_pt || "",
            manufacturer: data.manufacturer || "Generic",
            price: data.price || 0,
            currency: data.currency || "ZAR",
            stock_quantity: data.stock_quantity || 0,
            specifications: data.specifications || "",
          })
          setImageUrl(data.image_url)

          if (data.category_id) {
            // Wait for dbCategories to populate before auto-selecting? Actually we can just check it once dbCategories has length.
            // But we can hold data.category_id and do it in another useEffect. 
            // For now, let's just set initial state directly. We'll handle matching in the hook.
            // This is handled by a separate effect below.
          }
        }
      } catch (err: any) {
        console.error("Error fetching product:", err)
        setError("Failed to fetch product details.")
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [productId, supabase])

  useEffect(() => {
    if (dbCategories.length > 0 && !selectedMainCategoryId) {
      supabase.from("products").select("category_id").eq("id", productId).single().then(({ data }) => {
        if (data?.category_id) {
          const matchedCat = dbCategories.find(c => c.id === data.category_id)
          if (matchedCat) {
            if (matchedCat.parent_id) {
              setSelectedMainCategoryId(matchedCat.parent_id)
              setSelectedSubCategoryId(matchedCat.id)
            } else {
              setSelectedMainCategoryId(matchedCat.id)
            }
          }
        }
      })
    }
  }, [dbCategories, productId, selectedMainCategoryId, supabase])


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

    if (!selectedMainCategoryId) {
      setError("Please select a main category")
      return
    }

    setSaving(true)

    try {
      const specs = formData.specifications.trim() || null
      const finalCategoryId = selectedSubCategoryId || selectedMainCategoryId

      const { error: updateError } = await supabase
        .from("products")
        .update({
          name: formData.name,
          name_pt: formData.name_pt,
          description: formData.description,
          description_pt: formData.description_pt,
          category_id: finalCategoryId,
          brand: formData.manufacturer || "Generic",
          manufacturer: formData.manufacturer,
          price: Number.parseFloat(formData.price.toString()),
          currency: formData.currency,
          stock_quantity: Number.parseInt(formData.stock_quantity.toString()),
          specifications: specs,
          image_url: imageUrl,
        })
        .eq("id", productId)

      if (updateError) throw updateError

      router.push(`/admin/products`)
    } catch (err: any) {
      console.error("Error updating product:", err)
      setError(err.message || "Failed to update product")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading product details...</div>
  }

  return (
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
              <label className="text-sm font-medium text-foreground mb-2 block">Main Category *</label>
              <select
                value={selectedMainCategoryId}
                onChange={(e) => {
                  setSelectedMainCategoryId(e.target.value)
                  setSelectedSubCategoryId("") // reset subcategory on main cat change
                }}
                className="w-full border rounded px-3 py-2 mb-4"
                required
              >
                <option value="" disabled>Select Main Category</option>
                {mainCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>

              <label className="text-sm font-medium text-foreground mb-2 block">Sub Category</label>
              <select
                value={selectedSubCategoryId}
                onChange={(e) => setSelectedSubCategoryId(e.target.value)}
                className="w-full border rounded px-3 py-2"
                disabled={!selectedMainCategoryId || subCategories.length === 0}
              >
                <option value="">No Subcategory</option>
                {subCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
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

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Price *</label>
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
              <label className="text-sm font-medium text-foreground mb-2 block">Currency</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                {["ZAR", "USD", "EUR", "GBP", "NAD", "MZN", "AOA"].map((curr) => (
                  <option key={curr} value={curr}>
                    {curr}
                  </option>
                ))}
              </select>
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
            <label className="text-sm font-medium text-foreground mb-2 block">Specifications</label>
            <Textarea
              value={formData.specifications}
              onChange={(e) => setFormData({ ...formData, specifications: e.target.value })}
              placeholder="Enter product specifications, dimensions, materials, etc."
              rows={4}
            />
            <p className="text-xs text-slate-600 mt-1">Optional: Enter regular text describing the specifications</p>
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={saving}>
              {saving ? "Updating..." : "Update Product"}
            </Button>
            <Link href={`/admin/products/detail?id=${productId}`}>
              <Button variant="outline" type="button">Cancel</Button>
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Minus, Plus, ShoppingCart } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
// Removed: import { useCart } from "@/lib/context/cart-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { Product } from "@/lib/types"

// Dialog and its components
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useDispatch } from 'react-redux';
import { addToCart } from '@/lib/store/cartSlice';


export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const dispatch = useDispatch(); // Use Redux dispatch
  const supabase = createClient()

  // State for product reporting
  const [isReporting, setIsReporting] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportSuccess, setReportSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProduct() {
      try {
        const { data, error } = await supabase.from("products").select("*").eq("id", params.id).single()

        if (error) throw error
        setProduct(data)
      } catch (error) {
        console.error("Error fetching product:", error)
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchProduct()
    }
  }, [params.id, supabase])

  async function handleAddToCart() {
    if (!product) return

    setAdding(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      await dispatch(addToCart({ productId: product.id, quantity }) as any)
      setAdded(true)
      setTimeout(() => setAdded(false), 2000)
    } catch (error) {
      console.error("Error adding to cart:", error)
    } finally {
      setAdding(false)
    }
  }

  async function handleSubmitReport() {
    setReportError(null);
    setReportSuccess(null);
    if (!product || !reportReason) {
      setReportError("Please select a reason.");
      return;
    }

    setIsReporting(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setReportError("You must be logged in to report a product.");
        return;
      }

      const response = await fetch("/api/report-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          reason: reportReason,
          description: reportDescription,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to submit report.");
      }

      setReportSuccess("Product reported successfully! Thank you for your feedback.");
      setReportReason("");
      setReportDescription("");
    } catch (err: any) {
      console.error("[v0] Error submitting report:", err);
      setReportError(err.message || "An error occurred while submitting your report.");
    } finally {
      setIsReporting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Loading product...</p>
        </div>
      </main>
    )
  }

  if (!product) {
    return (
      <main className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
          <Link href="/shop" className="text-primary hover:underline">
            Back to Shop
          </Link>
        </div>
      </main>
    )
  }

  const displayPrice = product.price > 0 ? `R${product.price.toFixed(2)}` : "Price TBD"
  const canAddToCart = product.stock_quantity > 0 && product.price > 0

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Link href="/shop" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Shop
        </Link>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Product Image */}
          <div className="bg-gradient-to-br from-blue-50 to-slate-100 rounded-lg h-96 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">
                {product.category === "Resistors"
                  ? "⧉"
                  : product.category === "LEDs"
                    ? "💡"
                    : product.category === "Capacitors"
                      ? "||"
                      : product.category === "Wires & Connectors"
                        ? "🔌"
                        : product.category === "Breadboards"
                          ? "📍"
                          : product.category === "Microcontrollers"
                            ? "🎮"
                            : "⚙"}
              </div>
              <p className="text-muted-foreground">{product.category}</p>
            </div>
          </div>

          {/* Product Info */}
          <div>
            <p className="text-accent font-semibold mb-2">{product.category}</p>
            <h1 className="text-3xl font-bold text-foreground mb-4">{product.name}</h1>
            <p className="text-muted-foreground mb-6">{product.description}</p>

            <div className="flex items-center gap-4 mb-6">
              <span className="text-3xl font-bold text-primary">{displayPrice}</span>
              <span
                className={`px-3 py-1 rounded-full text-sm ${
                  product.stock_quantity > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                }`}
              >
                {product.stock_quantity > 0 ? `${product.stock_quantity} in stock` : "Out of stock"}
              </span>
            </div>

            {/* Specifications */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-4">Specifications</h3>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Brand</dt>
                    <dd className="font-medium">{product.brand}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Category</dt>
                    <dd className="font-medium">{product.category}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">SKU</dt>
                    <dd className="font-medium">{product.sku || "N/A"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Stock</dt>
                    <dd className="font-medium">{product.stock_quantity} units</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            {/* Quantity and Add to Cart */}
            <div className="flex items-center gap-4">
              <div className="flex items-center border border-border rounded-lg">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-3 hover:bg-muted transition"
                  disabled={quantity <= 1}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-4 py-2 font-medium">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                  className="p-3 hover:bg-muted transition"
                  disabled={quantity >= product.stock_quantity}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <Button onClick={handleAddToCart} disabled={!canAddToCart || adding} size="lg" className="flex-1">
                <ShoppingCart className="w-5 h-5 mr-2" />
                {adding ? "Adding..." : added ? "Added to Cart!" : "Add to Cart"}
              </Button>
            </div>

            {!canAddToCart && (
              <p className="text-sm text-muted-foreground mt-4">
                {product.stock_quantity === 0
                  ? "This product is currently out of stock."
                  : "Price not yet available. Please check back later."}
              </p>
            )}

            {/* Report Product Button */}
            <div className="mt-8">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    Report Product
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Report Product</DialogTitle>
                    <DialogDescription>
                      Help us maintain product quality by reporting any issues.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="reason" className="text-right">
                        Reason
                      </Label>
                      <Select value={reportReason} onValueChange={setReportReason}>
                        <SelectTrigger className="col-span-3" id="reason">
                          <SelectValue placeholder="Select a reason" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="inaccurate_description">Inaccurate Description</SelectItem>
                          <SelectItem value="wrong_category">Wrong Category</SelectItem>
                          <SelectItem value="offensive_content">Offensive Content</SelectItem>
                          <SelectItem value="prohibited_item">Prohibited Item</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="description" className="text-right">
                        Description (Optional)
                      </Label>
                      <Textarea
                        id="description"
                        value={reportDescription}
                        onChange={(e) => setReportDescription(e.target.value)}
                        className="col-span-3"
                        placeholder="Provide more details about the issue..."
                      />
                    </div>
                    {reportError && <p className="text-red-500 text-sm col-span-4 text-center">{reportError}</p>}
                    {reportSuccess && <p className="text-green-500 text-sm col-span-4 text-center">{reportSuccess}</p>}
                  </div>
                  <DialogFooter>
                    <Button onClick={handleSubmitReport} disabled={isReporting || !reportReason}>
                      {isReporting ? "Submitting..." : "Submit Report"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
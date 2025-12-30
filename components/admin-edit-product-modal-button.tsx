"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ProductModal } from "@/components/product-modal"
import type { Product } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import { toast } from "@/hooks/use-toast"

interface AdminEditProductModalButtonProps {
  productId: string
}

export function AdminEditProductModalButton({ productId }: AdminEditProductModalButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [product, setProduct] = useState<Product | null>(null)
  const [storeName, setStoreName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function fetchProductData() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("products")
          .select("*, seller:sellers(store_name)")
          .eq("id", productId)
          .single();

        if (error) throw error;
        if (data) {
          setProduct(data);
          setStoreName(data.seller?.store_name || "N/A");
        }
      } catch (error: any) {
        console.error("Error fetching product for edit:", error.message);
        toast({
          title: "Error",
          description: "Failed to load product for editing.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }
    fetchProductData();
  }, [productId, supabase]);


  const handleSuccess = () => {
    // Refresh the page to show the updated product details
    router.refresh()
    setIsModalOpen(false); // Close modal on success
  }

  if (loading) return <div>Loading product for edit...</div>;
  if (!product) return <div>Product not found.</div>;

  return (
    <>
      <Button onClick={() => setIsModalOpen(true)}>Edit Product</Button>
      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        sellerId={product.seller_id as string} // Assuming seller_id exists
        storeName={storeName || "N/A"}
        product={product}
        onSuccess={handleSuccess}
      />
    </>
  )
}

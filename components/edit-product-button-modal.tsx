"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ProductModal } from "@/components/product-modal"
import type { Product } from "@/lib/types"

interface EditProductButtonModalProps {
  sellerId: string
  storeName: string
  product: Product
}

export function EditProductButtonModal({ sellerId, storeName, product }: EditProductButtonModalProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const router = useRouter()

  const handleSuccess = () => {
    // Refresh the page to show the updated product details
    router.refresh()
  }

  return (
    <>
      <Button onClick={() => setIsModalOpen(true)}>Edit Product</Button>
      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        sellerId={sellerId}
        storeName={storeName}
        product={product}
        onSuccess={handleSuccess}
      />
    </>
  )
}
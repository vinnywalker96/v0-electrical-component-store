"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ProductModal } from "@/components/product-modal"

interface AddProductButtonModalProps {
  sellerId: string
  storeName: string
}

export function AddProductButtonModal({ sellerId, storeName }: AddProductButtonModalProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const router = useRouter()

  const handleSuccess = () => {
    // Refresh the page to show the newly added product
    router.refresh()
  }

  return (
    <>
      <Button onClick={() => setIsModalOpen(true)}>Add New Product</Button>
      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        sellerId={sellerId}
        storeName={storeName}
        onSuccess={handleSuccess}
      />
    </>
  )
}
"use client"

import React, { useState, useEffect } from "react"
import { Modal } from "@/components/ui/modal"
import { SellerProductForm } from "@/components/seller-product-form"
import type { Product } from "@/lib/types"

interface ProductModalProps {
  isOpen: boolean
  onClose: () => void
  sellerId: string
  storeName: string
  product?: Product
  onSuccess: () => void // Callback for when the form is successfully submitted
}

export function ProductModal({ isOpen, onClose, sellerId, storeName, product, onSuccess }: ProductModalProps) {
  // Reset form data or state when modal opens/closes, if necessary
  useEffect(() => {
    if (!isOpen) {
      // Any specific reset logic could go here if the form itself doesn't handle it
    }
  }, [isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product ? "Edit Product" : "Add New Product"}
      className="max-w-2xl" // Adjust modal width for the form
    >
      <SellerProductForm
        sellerId={sellerId}
        storeName={storeName}
        product={product}
        onSuccess={() => {
            onSuccess(); // Call the parent's onSuccess
            onClose();   // Close the modal
        }}
      />
    </Modal>
  )
}

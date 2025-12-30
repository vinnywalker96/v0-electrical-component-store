"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export function DeleteProductButton({ productId }: { productId: string }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this product? This action cannot be undone.")) return

    setDeleting(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("products").delete().eq("id", productId)

      if (error) throw error

      toast({
        title: "Success",
        description: "Product deleted successfully!",
      });

      router.refresh()
    } catch (error) {
      console.error("Error deleting product:", error)
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive"
      });
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDelete}
      disabled={deleting}
      className="text-red-600 bg-transparent"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )
}

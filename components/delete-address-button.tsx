"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { useLanguage } from "@/lib/context/language-context"

export function DeleteAddressButton({ addressId, isDefault }: { addressId: string; isDefault: boolean }) {
  const router = useRouter()
  const { t } = useLanguage()
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (isDefault) {
      alert(t("addresses.cannot_delete_default"))
      return
    }

    if (!confirm(t("addresses.confirm_delete"))) return

    setDeleting(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("addresses").delete().eq("id", addressId)

      if (error) throw error

      router.refresh()
    } catch (error) {
      console.error("Error deleting address:", error)
      alert(t("addresses.delete_failed"))
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

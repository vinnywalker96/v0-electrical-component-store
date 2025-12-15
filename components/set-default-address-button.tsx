"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

export function SetDefaultAddressButton({ addressId }: { addressId: string }) {
  const router = useRouter()
  const [setting, setSetting] = useState(false)

  const handleSetDefault = async () => {
    setSetting(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      // Unset all defaults for this user
      await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id)

      // Set this address as default
      const { error } = await supabase.from("addresses").update({ is_default: true }).eq("id", addressId)

      if (error) throw error

      router.refresh()
    } catch (error) {
      console.error("Error setting default:", error)
      alert("Failed to set default address")
    } finally {
      setSetting(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleSetDefault} disabled={setting}>
      {setting ? "Setting..." : "Set as Default"}
    </Button>
  )
}

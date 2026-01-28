"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle } from "lucide-react"
import { useLanguage } from "@/lib/context/language-context"

interface OrderStatusUpdaterProps {
  orderId: string
  currentStatus: string
  currentPaymentStatus: string
}

export function OrderStatusUpdater({ orderId, currentStatus, currentPaymentStatus }: OrderStatusUpdaterProps) {
  const router = useRouter()
  const { t } = useLanguage()
  const [status, setStatus] = useState(currentStatus)
  const [paymentStatus, setPaymentStatus] = useState(currentPaymentStatus)
  const [updating, setUpdating] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleUpdate = async () => {
    setUpdating(true)
    setSuccess(false)

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("orders")
        .update({
          status,
          payment_status: paymentStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId)

      if (error) throw error

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      router.refresh()
    } catch (error) {
      console.error("Error updating order:", error)
      alert(t("order_status.update_error"))
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="space-y-4">
      {success && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-900">{t("order_status.mark_paid_success")}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">{t("seller_orders.status")}</label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">{t("seller_orders.pending")}</SelectItem>
              <SelectItem value="processing">{t("seller_orders.processing")}</SelectItem>
              <SelectItem value="shipped">{t("seller_orders.shipped")}</SelectItem>
              <SelectItem value="delivered">{t("seller_orders.delivered")}</SelectItem>
              <SelectItem value="cancelled">{t("common.cancel")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">{t("seller_orders.payment_status")}</label>
          <Select value={paymentStatus} onValueChange={setPaymentStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unpaid">{t("seller_orders.payment_status")}</SelectItem>
              <SelectItem value="paid">{t("seller_orders.payment_status")}</SelectItem>
              <SelectItem value="refunded">{t("seller_orders.payment_status")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        onClick={handleUpdate}
        disabled={updating || (status === currentStatus && paymentStatus === currentPaymentStatus)}
      >
        {updating ? t("order_status.updating") : t("order_status.update_status")}
      </Button>
    </div>
  )
}

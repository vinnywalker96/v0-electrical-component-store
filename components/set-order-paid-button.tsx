"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { CheckCircle2, DollarSign } from "lucide-react"
import { useLanguage } from "@/lib/context/language-context"

interface SetOrderPaidButtonProps {
  orderId: string
  currentPaymentStatus: string
}

export function SetOrderPaidButton({ orderId, currentPaymentStatus }: SetOrderPaidButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { t } = useLanguage()
  const supabase = createClient()

  const handleSetPaid = async () => {
    if (currentPaymentStatus === "paid") {
      toast({
        title: t("seller_orders.payment_status"),
        description: t("order_status.mark_paid_success"),
        variant: "default"
      });
      return;
    }

    if (!confirm(t("order_status.confirm_paid"))) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ payment_status: "paid" })
        .eq("id", orderId);

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: t("order_status.mark_paid_success"),
        variant: "default"
      });
      router.refresh(); // Refresh the page to show updated status
    } catch (error: any) {
      console.error("[v0] Error setting order as paid:", error.message);
      toast({
        title: t("common.error"),
        description: t("order_status.mark_paid_error"),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleSetPaid}
      disabled={loading || currentPaymentStatus === "paid"}
      className="flex items-center gap-2"
      variant={currentPaymentStatus === "paid" ? "outline" : "default"}
    >
      {loading ? t("order_status.updating") : (
        <>
          {currentPaymentStatus === "paid" ? <CheckCircle2 size={16} /> : <DollarSign size={16} />}
          {currentPaymentStatus === "paid" ? t("seller_orders.payment_status") : t("order_status.set_as_paid")}
        </>
      )}
    </Button>
  );
}

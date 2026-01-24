"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { CheckCircle2, DollarSign } from "lucide-react"

interface SetOrderPaidButtonProps {
  orderId: string
  currentPaymentStatus: string
}

export function SetOrderPaidButton({ orderId, currentPaymentStatus }: SetOrderPaidButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSetPaid = async () => {
    if (currentPaymentStatus === "paid") {
      toast({
        title: "Order Already Paid",
        description: "This order has already been marked as paid.",
        variant: "default"
      });
      return;
    }

    if (!confirm("Are you sure you want to mark this order as PAID?")) {
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
        title: "Payment Status Updated",
        description: `Order #${orderId.slice(0, 8)} has been marked as PAID.`,
        variant: "default"
      });
      router.refresh(); // Refresh the page to show updated status
    } catch (error: any) {
      console.error("[v0] Error setting order as paid:", error.message);
      toast({
        title: "Error",
        description: "Failed to mark order as paid.",
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
      {loading ? "Updating..." : (
        <>
          {currentPaymentStatus === "paid" ? <CheckCircle2 size={16} /> : <DollarSign size={16} />}
          {currentPaymentStatus === "paid" ? "Paid" : "Mark as Paid"}
        </>
      )}
    </Button>
  );
}

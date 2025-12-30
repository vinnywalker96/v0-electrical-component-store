"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import type { Order } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export default function AdminOrdersPage() {
  const supabase = createClient()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false })

        setOrders(data || [])
      } catch (error) {
        console.error("[v0] Error fetching orders:", error)
        toast({
          title: "Error",
          description: "Failed to fetch orders.",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
  }, [supabase])

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId) 
        : [...prev, orderId]
    );
  };

  const handleSelectAll = () => {
    if (selectedOrders.length === filteredOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(filteredOrders.map(o => o.id));
    }
  };

  const handleBulkStatusChange = async (newStatus: string) => {
    if (!confirm(`Are you sure you want to update ${selectedOrders.length} orders to "${newStatus}"?`)) return;

    try {
      const { error } = await supabase.from("orders").update({ status: newStatus }).in("id", selectedOrders);
      if (error) throw error;
      
      setOrders(orders.map(o => selectedOrders.includes(o.id) ? { ...o, status: newStatus } : o));
      setSelectedOrders([]);
      toast({
        title: "Success",
        description: `${selectedOrders.length} orders updated successfully!`,
      });

      // Potentially send notifications for bulk completion
      if (newStatus === "delivered") {
        // This could be enhanced to send multiple notifications
        console.log("Bulk order completion notification logic can be added here.");
      }
    } catch (error) {
      console.error("Error bulk updating orders:", error);
      toast({
        title: "Error",
        description: "Failed to update selected orders.",
        variant: "destructive"
      });
    }
  };

  async function updateOrderStatus(orderId: string, newStatus: string) {
    try {
      const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", orderId)

      if (error) throw error

      setOrders(orders.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)))
      toast({
        title: "Order Status Updated",
        description: `Order #${orderId.slice(0, 8)} status updated to ${newStatus}.`,
      });

      // Send notification if order is completed
      if (newStatus === "delivered") {
        try {
          // Fetch the updated order to get customer details
          const { data: updatedOrder, error: fetchError } = await supabase
            .from("orders")
            .select("*, user_id:profiles(first_name, last_name, email)")
            .eq("id", orderId)
            .single();

          if (fetchError || !updatedOrder) {
            console.error("[v0] Could not fetch order for completion notification:", fetchError?.message);
            // Continue without notification if fetch fails
          } else {
            await fetch("/api/admin/notify-order-completion", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: updatedOrder.id,
                totalAmount: updatedOrder.total_amount,
                customerName: `${updatedOrder.user_id?.first_name || "N/A"} ${updatedOrder.user_id?.last_name || ""}`,
                customerEmail: updatedOrder.user_id?.email || "N/A",
              }),
            });
          }
        } catch (notificationError) {
          console.warn("[v0] Failed to send order completion notification to admins:", notificationError);
        }
      }
    } catch (error) {
      console.error("[v0] Error updating order:", error)
      toast({
        title: "Error",
        description: "Failed to update order status.",
        variant: "destructive"
      });
    }
  }

  const filteredOrders = statusFilter === "all" ? orders : orders.filter((o) => o.status === statusFilter)

  if (loading) {
    return <div className="text-center py-12">Loading orders...</div>
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Link href="/admin/dashboard" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-8">
          <ArrowLeft size={20} />
          Back to Admin Dashboard
        </Link>

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-foreground">All Orders</h1>
          <div className="flex gap-4 items-center">
            {selectedOrders.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">Bulk Actions ({selectedOrders.length})</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleBulkStatusChange("processing")}>Set to Processing</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkStatusChange("shipped")}>Set to Shipped</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkStatusChange("delivered")}>Set to Delivered</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkStatusChange("cancelled")}>Set to Cancelled</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
            )}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block sr-only">Filter by Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            {filteredOrders.length === 0 ? (
              <p className="text-center text-slate-600 py-12">No orders found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="py-3 px-4">
                        <Checkbox
                            checked={selectedOrders.length > 0 && selectedOrders.length === filteredOrders.length}
                            onCheckedChange={handleSelectAll}
                        />
                      </th>
                      <th className="text-left py-3 px-4 font-semibold">Order ID</th>
                      <th className="text-left py-3 px-4 font-semibold">Date</th>
                      <th className="text-left py-3 px-4 font-semibold">Status</th>
                      <th className="text-left py-3 px-4 font-semibold">Payment</th>
                      <th className="text-right py-3 px-4 font-semibold">Total</th>
                      <th className="text-center py-3 px-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr key={order.id} className="border-b hover:bg-slate-50">
                        <td className="py-3 px-4">
                            <Checkbox
                                checked={selectedOrders.includes(order.id)}
                                onCheckedChange={() => handleSelectOrder(order.id)}
                            />
                        </td>
                        <td className="py-3 px-4 font-mono text-sm">{order.id.slice(0, 8)}</td>
                        <td className="py-3 px-4 text-sm">{new Date(order.created_at).toLocaleDateString()}</td>
                        <td className="py-3 px-4">
                          <select
                            value={order.status}
                            onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                            className="px-2 py-1 border rounded text-sm bg-white"
                          >
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td className="py-3 px-4 text-sm capitalize">{order.payment_method.replace(/_/g, " ")}</td>
                        <td className="py-3 px-4 text-right font-semibold">${order.total_amount.toFixed(2)}</td>
                        <td className="py-3 px-4 text-center">
                          <Link href={`/admin/orders/${order.id}`}>
                            <Button variant="outline" size="sm">
                              View
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

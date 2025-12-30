"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import type { Order } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { format } from "date-fns" // For date formatting
import { toast } from "@/hooks/use-toast"

// Helper function to get date ranges (copied from admin dashboard, could be a utility)
const getDateRange = (period: "day" | "week" | "month" | "year") => {
  const now = new Date();
  let startDate = new Date();
  let endDate = new Date();

  switch (period) {
    case "day":
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    case "week":
      startDate.setDate(now.getDate() - now.getDay()); // Start of the current week (Sunday)
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(startDate.getDate() + 6); // End of the current week (Saturday)
      endDate.setHours(23, 59, 59, 999);
      break;
    case "month":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    case "year":
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;
  }
  return { startDate, endDate };
};

interface AdminSalesTableProps {
  filterPeriod: "day" | "week" | "month" | "year";
}

const COMMISSION_RATE = 0.15; // 15% commission rate

export function AdminSalesTable({ filterPeriod }: AdminSalesTableProps) {
  const supabase = createClient();
  const [salesData, setSalesData] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSales = async () => {
      setLoading(true);
      try {
        const { startDate, endDate } = getDateRange(filterPeriod);

        const { data: ordersData, error: ordersError } = await supabase
          .from("orders")
          .select("*") // Fetch orders first
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString())
          .order("created_at", { ascending: false });

        if (ordersError) throw ordersError;

        // Explicitly fetch profiles for each order
        const salesWithProfiles = await Promise.all(
          (ordersData || []).map(async (order) => {
            const { data: profileData, error: profileError } = await supabase
              .from("profiles")
              .select("first_name, last_name, email")
              .eq("id", order.user_id)
              .single();

            if (profileError) {
              console.warn(`[v0] Could not fetch profile for user ${order.user_id}:`, profileError.message);
              return { ...order, user_id: null }; // Attach null profile
            }
            return { ...order, user_id: profileData };
          })
        );

        setSalesData(salesWithProfiles as any);
      } catch (error: any) {
        console.error("Error fetching sales data:", error.message);
        toast({
          title: "Error",
          description: "Failed to load sales data.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSales();
  }, [filterPeriod, supabase]);

  if (loading) {
    return <div className="text-center py-12">Loading sales data...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales Overview</CardTitle>
        <div className="text-sm text-muted-foreground">Sales from {filterPeriod === "day" ? "today" : filterPeriod === "week" ? "this week" : filterPeriod === "month" ? "this month" : "this year"}</div>
      </CardHeader>
      <CardContent>
        {salesData.length === 0 ? (
          <p className="text-center text-slate-600 py-12">No sales data found for this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold">Order ID</th>
                  <th className="text-left py-3 px-4 font-semibold">Date</th>
                  <th className="text-left py-3 px-4 font-semibold">Client</th>
                  <th className="text-left py-3 px-4 font-semibold">Email</th>
                  <th className="text-right py-3 px-4 font-semibold">Total Amount</th>
                  <th className="text-right py-3 px-4 font-semibold">Commission</th>
                </tr>
              </thead>
              <tbody>
                {salesData.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono text-sm">
                      <Link href={`/admin/orders/${order.id}`} className="text-blue-600 hover:underline">
                        {order.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-sm">{format(new Date(order.created_at), "PPP")}</td>
                    <td className="py-3 px-4 text-sm">
                        {/* Check if user_id exists and has first_name/last_name properties */}
                        {order.user_id?.first_name && order.user_id?.last_name 
                          ? `${order.user_id.first_name} ${order.user_id.last_name}` 
                          : "N/A"}
                    </td>
                    <td className="py-3 px-4 text-sm">{order.user_id?.email || "N/A"}</td>
                    <td className="py-3 px-4 text-right font-semibold">R{order.total_amount.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right text-green-600 font-semibold">
                      R{(order.total_amount * COMMISSION_RATE).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

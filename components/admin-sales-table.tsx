"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import type { Order } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { format } from "date-fns" // For date formatting
import { toast } from "@/hooks/use-toast"
import { useLanguage } from "@/lib/context/language-context"

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
  const { t } = useLanguage()

  useEffect(() => {
    const fetchSales = async () => {
      setLoading(true);
      try {
        const { startDate, endDate } = getDateRange(filterPeriod);

        // 1. Fetch Orders first (without join which fails)
        const { data: ordersData, error: ordersError } = await supabase
          .from("orders")
          .select("*")
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString())
          .order("created_at", { ascending: false });

        if (ordersError) throw ordersError;

        if (!ordersData || ordersData.length === 0) {
          setSalesData([]);
          setLoading(false);
          return;
        }

        // 2. Fetch Profiles for these orders
        // Get unique user IDs
        const userIds = Array.from(new Set(ordersData.map(o => o.user_id).filter(Boolean)));

        let profilesMap: Record<string, any> = {};

        if (userIds.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from("profiles")
            .select("*")
            .in("id", userIds);

          if (!profilesError && profiles) {
            profiles.forEach(p => {
              profilesMap[p.id] = p;
            });
          }
        }

        // 3. Merge data
        const enrichedOrders = ordersData.map(order => ({
          ...order,
          user: profilesMap[order.user_id] || null
        }));

        setSalesData(enrichedOrders);
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
    return <div className="text-center py-12">{t("admin_dashboard.loading_sales")}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("admin_dashboard.sales_overview")}</CardTitle>
        <div className="text-sm text-muted-foreground">
          {t("admin_dashboard.sales_from", {
            period: filterPeriod === "day" ? t("admin_dashboard.periods.today") :
              filterPeriod === "week" ? t("admin_dashboard.periods.week") :
                filterPeriod === "month" ? t("admin_dashboard.periods.month") :
                  t("admin_dashboard.periods.year")
          })}
        </div>
      </CardHeader>
      <CardContent>
        {salesData.length === 0 ? (
          <p className="text-center text-slate-600 py-12">{t("admin_dashboard.no_sales_data")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold">{t("admin_dashboard.table.order_id")}</th>
                  <th className="text-left py-3 px-4 font-semibold">{t("admin_dashboard.table.date")}</th>
                  <th className="text-left py-3 px-4 font-semibold">{t("admin_dashboard.table.client")}</th>
                  <th className="text-left py-3 px-4 font-semibold">{t("admin_dashboard.table.email")}</th>
                  <th className="text-right py-3 px-4 font-semibold">{t("admin_dashboard.table.total_amount")}</th>
                  <th className="text-right py-3 px-4 font-semibold">{t("admin_dashboard.table.commission")}</th>
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
                      {order.user?.first_name && order.user?.last_name
                        ? `${order.user.first_name} ${order.user.last_name}`
                        : "N/A"}
                    </td>
                    <td className="py-3 px-4 text-sm">{order.user?.email || "N/A"}</td>                    <td className="py-3 px-4 text-right font-semibold">R{order.total_amount.toFixed(2)}</td>
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

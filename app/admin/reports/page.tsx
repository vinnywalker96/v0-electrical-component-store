"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Order } from "@/lib/types"
import { useCurrency } from "@/lib/context/currency-context"
import { useLanguage } from "@/lib/context/language-context"

export default function AdminReportsPage() {
  const supabase = createClient()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { formatPrice } = useCurrency()
  const { t } = useLanguage()

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setError(t("admin_reports.unauthorized"))
          setLoading(false)
          return
        }

        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
        if (profile?.role !== "admin" && profile?.role !== "super_admin") {
          setError(t("admin_reports.forbidden"))
          setLoading(false)
          return
        }

        const { data: ordersData, error: ordersError } = await supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false })

        if (ordersError) {
          throw ordersError
        }
        setOrders(ordersData || [])
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchOrders()
  }, [supabase, t])

  if (loading) {
    return <div className="p-4">{t("admin_reports.loading_reports")}</div>
  }

  if (error) {
    return <div className="p-4 text-red-500">{t("admin.error")}{error}</div>
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">{t("admin_reports.admin_reports_all_orders")}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{t("admin_reports.orders_overview")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin_reports.order_id")}</TableHead>
                <TableHead>{t("admin_reports.date")}</TableHead>
                <TableHead>{t("admin_reports.total_amount")}</TableHead>
                <TableHead>{t("admin_reports.status")}</TableHead>
                <TableHead>{t("admin_reports.payment_status")}</TableHead>
                <TableHead>{t("admin_reports.user_id")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.id.substring(0, 8)}</TableCell>
                  <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>{formatPrice(order.total_amount)}</TableCell>
                  <TableCell className="capitalize">{t(`seller_orders.${order.status}`)}</TableCell>
                  <TableCell className="capitalize">{t(`seller_orders.${order.payment_status}`)}</TableCell>
                  <TableCell>{order.user_id?.substring(0, 8)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

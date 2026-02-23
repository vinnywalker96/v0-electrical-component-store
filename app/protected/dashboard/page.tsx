"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import type { UserProfile, Order } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Package,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useCurrency } from "@/lib/context/currency-context"
import { useLanguage } from "@/lib/context/language-context"

export default function DashboardPage() {
  const supabase = useMemo(() => createClient(), [])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [isSeller, setIsSeller] = useState(false)
  const [stats, setStats] = useState({
    completed: 0,
    inProgress: 0,
    onHold: 0,
  })
  const { formatPrice } = useCurrency()
  const { t } = useLanguage()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        setUser(user)

        if (user) {
          const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single()

          if (profileData) {
            setProfile(profileData)
          }

          const { data: sellerData } = await supabase.from("sellers").select("id").eq("user_id", user.id).single()
          setIsSeller(!!sellerData)

          const { data: ordersData } = await supabase
            .from("orders")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })

          setOrders(ordersData || [])

          // Calculate stats
          const completed = ordersData?.filter((o) => o.status === "completed").length || 0
          const inProgress = ordersData?.filter((o) => o.status === "processing" || o.status === "shipped").length || 0
          const onHold = ordersData?.filter((o) => o.status === "pending").length || 0

          setStats({ completed, inProgress, onHold })
        }
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [supabase])

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">{t("user_dashboard.loading_dashboard")}</div>
  }

  const totalOrders = stats.completed + stats.inProgress + stats.onHold

  return (
    <>
      {/* Header with user greeting */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t("user_dashboard.hello_user", { user_name: profile?.first_name || "User" })}</h1>
          <p className="text-slate-600 mt-1">{t("user_dashboard.welcome_back")}</p>
        </div>
        <div className="flex items-center gap-4">
          {isSeller && (
            <Link href="/seller/dashboard">
              <Button>{t("user_dashboard.go_to_vendor_dashboard")}</Button>
            </Link>
          )}
          <Avatar className="w-12 h-12">
            <AvatarImage src={profile?.profile_image_url || ""} />
            <AvatarFallback className="bg-primary text-white">
              {(profile?.first_name?.[0] || user?.email?.[0] || "U").toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">{t("user_dashboard.work_overview")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl">
                <div className="flex items-center gap-2 text-green-700 mb-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm font-medium">{t("user_dashboard.completed")}</span>
                </div>
                <p className="text-3xl font-bold text-green-900">{stats.completed}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
                <div className="flex items-center gap-2 text-blue-700 mb-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">{t("user_dashboard.in_progress")}</span>
                </div>
                <p className="text-3xl font-bold text-blue-900">{stats.inProgress}</p>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl">
                <div className="flex items-center gap-2 text-orange-700 mb-2">
                  <XCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">{t("user_dashboard.on_hold")}</span>
                </div>
                <p className="text-3xl font-bold text-orange-900">{stats.onHold}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">{t("user_dashboard.work_category")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <svg width="160" height="160" viewBox="0 0 160 160" className="transform -rotate-90">
                {totalOrders > 0 ? (
                  <>
                    {/* Completed (green) */}
                    <circle
                      cx="80"
                      cy="80"
                      r="60"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="20"
                      strokeDasharray={`${(stats.completed / totalOrders) * 377} 377`}
                      strokeDashoffset="0"
                    />
                    {/* In Progress (blue) */}
                    <circle
                      cx="80"
                      cy="80"
                      r="60"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="20"
                      strokeDasharray={`${(stats.inProgress / totalOrders) * 377} 377`}
                      strokeDashoffset={`-${(stats.completed / totalOrders) * 377}`}
                    />
                    {/* On Hold (orange) */}
                    <circle
                      cx="80"
                      cy="80"
                      r="60"
                      fill="none"
                      stroke="#f97316"
                      strokeWidth="20"
                      strokeDasharray={`${(stats.onHold / totalOrders) * 377} 377`}
                      strokeDashoffset={`-${((stats.completed + stats.inProgress) / totalOrders) * 377}`}
                    />
                  </>
                ) : (
                  <circle cx="80" cy="80" r="60" fill="none" stroke="#e5e7eb" strokeWidth="20" />
                )}
              </svg>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-slate-600">{t("user_dashboard.completed")}</span>
                </div>
                <span className="font-semibold">{stats.completed}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-slate-600">{t("user_dashboard.in_progress")}</span>
                </div>
                <span className="font-semibold">{stats.inProgress}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                  <span className="text-slate-600">{t("user_dashboard.on_hold")}</span>
                </div>
                <span className="font-semibold">{stats.onHold}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">{t("user_dashboard.my_tasks")}</CardTitle>
            <Link href="/shop">
              <Button size="sm">{t("user_dashboard.view_all")}</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 mb-4">{t("user_dashboard.no_orders_yet")}</p>
              <Link href="/shop">
                <Button>{t("user_dashboard.start_shopping")}</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    <th className="py-3 px-4 text-sm font-semibold text-slate-600">{t("user_dashboard.date")}</th>
                    <th className="py-3 px-4 text-sm font-semibold text-slate-600">{t("user_dashboard.task_name")}</th>
                    <th className="py-3 px-4 text-sm font-semibold text-slate-600">{t("user_dashboard.work_level")}</th>
                    <th className="py-3 px-4 text-sm font-semibold text-slate-600">{t("user_dashboard.price_category")}</th>
                    <th className="py-3 px-4 text-sm font-semibold text-slate-600">{t("user_dashboard.status")}</th>
                    <th className="py-3 px-4 text-sm font-semibold text-slate-600">{t("user_dashboard.action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 5).map((order) => (
                    <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-4 px-4 text-sm text-slate-600">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-4 text-sm font-medium text-slate-900">{t("seller_orders.order_hash")}{order.id.slice(0, 8)}</td>
                      <td className="py-4 px-4 text-sm text-slate-600">{t("user_dashboard.standard")}</td>
                      <td className="py-4 px-4 text-sm text-slate-600">{formatPrice(order.total_amount)}</td>
                      <td className="py-4 px-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${order.status === "completed"
                            ? "bg-green-100 text-green-700"
                            : order.status === "processing" || order.status === "shipped"
                              ? "bg-blue-100 text-blue-700"
                              : order.status === "pending"
                                ? "bg-orange-100 text-orange-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                        >
                          {t(`seller_orders.${order.status}`)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <Link href={`/track-order/${order.id}`}>
                          <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                            {t("user_dashboard.track")}
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
    </>
  )
}

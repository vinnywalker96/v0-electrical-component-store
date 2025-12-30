"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

interface Commission {
  id: string
  amount: number
  status: string
  created_at: string
  paid_at: string | null
  order_id: string
}

export default function VendorCommissionsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [totalEarned, setTotalEarned] = useState(0)
  const [pendingAmount, setPendingAmount] = useState(0)

  const fetchCommissions = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/vendor/login")
        return
      }

      // Get seller profile
      const { data: seller } = await supabase.from("sellers").select("*").eq("user_id", user.id).single()

      if (!seller) {
        router.push("/seller/register")
        return
      }

      // Get commissions
      const { data: commissionsData } = await supabase
        .from("commissions")
        .select("*")
        .eq("seller_id", seller.id)
        .order("created_at", { ascending: false })

      setCommissions(commissionsData || [])

      const total = commissionsData?.reduce((sum, c) => (c.status === "paid" ? sum + c.amount : sum), 0) || 0
      const pending = commissionsData?.reduce((sum, c) => (c.status === "pending" ? sum + c.amount : sum), 0) || 0

      setTotalEarned(total)
      setPendingAmount(pending)
    } catch (error) {
      console.error("[v0] Error fetching commissions:", error)
    } finally {
      setLoading(false)
    }
  }, [router, supabase, setCommissions, setTotalEarned, setPendingAmount])

  useEffect(() => {
    fetchCommissions()
  }, [fetchCommissions])

  if (loading) {
    return <div className="text-center py-12">Loading commissions...</div>
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Link href="/vendor/dashboard" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-8">
          <ArrowLeft size={20} />
          Back to Dashboard
        </Link>

        <h1 className="text-4xl font-bold text-foreground mb-8">Commission History</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Total Earned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">R{totalEarned.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pending Payment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">R{pendingAmount.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Commission Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {commissions.length === 0 ? (
              <p className="text-slate-600">No commission records yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold">Date</th>
                      <th className="text-left py-3 px-4 font-semibold">Order ID</th>
                      <th className="text-left py-3 px-4 font-semibold">Amount</th>
                      <th className="text-left py-3 px-4 font-semibold">Status</th>
                      <th className="text-left py-3 px-4 font-semibold">Paid Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissions.map((commission) => (
                      <tr key={commission.id} className="border-b hover:bg-slate-50">
                        <td className="py-3 px-4">{new Date(commission.created_at).toLocaleDateString()}</td>
                        <td className="py-3 px-4 font-mono text-sm">{commission.order_id.slice(0, 8)}</td>
                        <td className="py-3 px-4 font-semibold">R{commission.amount.toFixed(2)}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-3 py-1 rounded-full text-sm capitalize ${
                              commission.status === "paid"
                                ? "bg-green-100 text-green-800"
                                : "bg-orange-100 text-orange-800"
                            }`}
                          >
                            {commission.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {commission.paid_at ? new Date(commission.paid_at).toLocaleDateString() : "-"}
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

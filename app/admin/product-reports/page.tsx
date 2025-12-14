"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
// import { createClient } from "@/lib/supabase/client" // Not needed for direct Redux interaction
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useSelector, useDispatch } from 'react-redux';
import { fetchAdminProductReports, updateProductReportStatus, selectAdminProductReports, selectAdminProductReportsLoading, selectAdminProductReportsError, ProductReport } from '@/lib/store/adminProductReportsSlice';


export default function AdminProductReportsPage() {
  const dispatch = useDispatch();
  const reports = useSelector(selectAdminProductReports);
  const loading = useSelector(selectAdminProductReportsLoading);
  const error = useSelector(selectAdminProductReportsError);

  useEffect(() => {
    dispatch(fetchAdminProductReports() as any);
  }, [dispatch]);


  async function handleStatusChange(reportId: string, newStatus: ProductReport['status']) {
    try {
      await dispatch(updateProductReportStatus({ reportId, status: newStatus }) as any);
    } catch (err: any) {
      alert(err.message || "Failed to update report status");
    }
  }
  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-xl text-foreground">Loading product reports...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Link href="/admin/dashboard" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-8">
          <ArrowLeft size={20} />
          Back to Admin Dashboard
        </Link>

        <h1 className="text-4xl font-bold text-foreground mb-8">Manage Product Reports</h1>

        <Card>
          <CardContent className="pt-6">
            {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

            {reports.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-600 mb-4">No product reports yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold">Report ID</th>
                      <th className="text-left py-3 px-4 font-semibold">Product</th>
                      <th className="text-left py-3 px-4 font-semibold">Reported By</th>
                      <th className="text-left py-3 px-4 font-semibold">Reason</th>
                      <th className="text-left py-3 px-4 font-semibold">Status</th>
                      <th className="text-left py-3 px-4 font-semibold">Submitted At</th>
                      <th className="text-center py-3 px-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((report) => (
                      <tr key={report.id} className="border-b hover:bg-slate-50">
                        <td className="py-3 px-4 text-sm">{report.id.substring(0, 8)}...</td>
                        <td className="py-3 px-4">
                          <Link href={`/shop/${report.products?.id}`} className="text-blue-600 hover:underline">
                            {report.products?.name}
                          </Link>
                        </td>
                        <td className="py-3 px-4">{report.profiles?.email}</td>
                        <td className="py-3 px-4 text-sm">{report.reason}</td>
                        <td className="py-3 px-4">
                          <Select
                            value={report.status}
                            onValueChange={(newStatus: ProductReport['status']) => handleStatusChange(report.id, newStatus)}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="reviewed">Reviewed</SelectItem>
                              <SelectItem value="dismissed">Dismissed</SelectItem>
                              <SelectItem value="acted_upon">Acted Upon</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-3 px-4 text-sm">{new Date(report.created_at).toLocaleDateString()}</td>
                        <td className="py-3 px-4 text-center">
                          {/* Additional actions like viewing full description in a dialog, or taking action on product */}
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

"use client"

import { useEffect } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client" // Keep createClient for auth check if needed
import type { Product } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trash2, Edit, Plus, ArrowLeft } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useSelector, useDispatch } from 'react-redux';
import { fetchAdminProducts, updateProduct, deleteProduct, selectAdminProducts, selectAdminProductsLoading, selectAdminProductsError } from '@/lib/store/adminProductsSlice';

export default function AdminProductsPage() {
  const dispatch = useDispatch();
  const products = useSelector(selectAdminProducts);
  const loading = useSelector(selectAdminProductsLoading);
  const error = useSelector(selectAdminProductsError);

  useEffect(() => {
    dispatch(fetchAdminProducts() as any);
  }, [dispatch]);

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this product?")) return
    try {
      await dispatch(deleteProduct(id) as any);
    } catch (err: any) {
      alert(err.message || "Failed to delete product");
    }
  }

  async function handleStatusChange(productId: string, newStatus: Product['status']) {
    try {
      await dispatch(updateProduct({ id: productId, status: newStatus }) as any);
    } catch (err: any) {
      alert(err.message || "Failed to update product status");
    }
  }

  async function handleToggleFeatured(productId: string, currentFeatured: boolean) {
    try {
      await dispatch(updateProduct({ id: productId, is_featured: !currentFeatured }) as any);
    } catch (err: any) {
      alert(err.message || "Failed to toggle featured status");
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-xl text-foreground">Loading products...</p>
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

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-foreground">Manage Products</h1>
        </div>

        <Card>
          <CardContent className="pt-6">
            {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

            {products.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-600 mb-4">No products yet</p>
                <Link href="/admin/products/new">
                  <Button>Create First Product</Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold">Name</th>
                      <th className="text-left py-3 px-4 font-semibold">Seller</th>
                      <th className="text-left py-3 px-4 font-semibold">Category</th>
                      <th className="text-left py-3 px-4 font-semibold">Status</th>
                      <th className="text-left py-3 px-4 font-semibold">Featured</th>
                      <th className="text-right py-3 px-4 font-semibold">Price</th>
                      <th className="text-right py-3 px-4 font-semibold">Stock</th>
                      <th className="text-center py-3 px-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id} className="border-b hover:bg-slate-50">
                        <td className="py-3 px-4 font-semibold">{product.name}</td>
                        <td className="py-3 px-4">
                          {product.profiles?.first_name} {product.profiles?.last_name}
                        </td>
                        <td className="py-3 px-4">{product.category}</td>
                        <td className="py-3 px-4">
                          <Select
                            value={product.status}
                            onValueChange={(newStatus: Product['status']) => handleStatusChange(product.id, newStatus)}
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="approved">Approved</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-3 px-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleFeatured(product.id, product.is_featured)}
                            className={product.is_featured ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                          >
                            {product.is_featured ? "Yes" : "No"}
                          </Button>
                        </td>
                        <td className="py-3 px-4 text-right">${product.price.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`px-2 py-1 rounded text-sm ${product.stock_quantity > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                          >
                            {product.stock_quantity}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center flex justify-center gap-2">
                          <Link href={`/admin/products/${product.id}/edit`}>
                            <Button variant="outline" size="sm" className="gap-1 bg-transparent">
                              <Edit size={16} />
                              Edit
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 gap-1 bg-transparent"
                            onClick={() => handleDelete(product.id)}
                          >
                            <Trash2 size={16} />
                            Delete
                          </Button>
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

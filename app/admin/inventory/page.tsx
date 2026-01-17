'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Package, AlertTriangle, TrendingUp, TrendingDown, Plus, Search, Filter } from 'lucide-react'

interface Product {
  id: string
  name: string
  sku: string
  stock_quantity: number
  low_stock_threshold: number
  track_inventory: boolean
  price: number
  sellers: {
    id: string
    business_name: string
  }
}

interface InventoryAlert {
  id: string
  product_id: string
  alert_type: string
  threshold: number
  current_quantity: number
  message: string
  created_at: string
}

export default function InventoryManagement() {
  const [products, setProducts] = useState<Product[]>([])
  const [alerts, setAlerts] = useState<InventoryAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showLowStock, setShowLowStock] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [adjustmentQuantity, setAdjustmentQuantity] = useState('')
  const [adjustmentOperation, setAdjustmentOperation] = useState<'set' | 'add' | 'subtract'>('set')
  const [adjustmentNotes, setAdjustmentNotes] = useState('')
  const [isAdjusting, setIsAdjusting] = useState(false)

  useEffect(() => {
    fetchInventory()
  }, [searchTerm, showLowStock])

  const fetchInventory = async () => {
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (showLowStock) params.append('lowStock', 'true')

      const response = await fetch(`/api/admin/inventory?${params}`)
      if (!response.ok) throw new Error('Failed to fetch inventory')

      const data = await response.json()
      setProducts(data.products || [])
      setAlerts(data.alerts || [])
    } catch (error) {
      console.error('Error fetching inventory:', error)
      toast.error('Failed to load inventory data')
    } finally {
      setLoading(false)
    }
  }

  const handleStockAdjustment = async () => {
    if (!selectedProduct || !adjustmentQuantity) return

    setIsAdjusting(true)
    try {
      const response = await fetch('/api/admin/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct.id,
          quantity: parseInt(adjustmentQuantity),
          operation: adjustmentOperation,
          notes: adjustmentNotes
        })
      })

      if (!response.ok) throw new Error('Failed to adjust stock')

      toast.success('Stock adjusted successfully')
      setSelectedProduct(null)
      setAdjustmentQuantity('')
      setAdjustmentNotes('')
      fetchInventory()
    } catch (error) {
      console.error('Error adjusting stock:', error)
      toast.error('Failed to adjust stock')
    } finally {
      setIsAdjusting(false)
    }
  }

  const getStockStatus = (product: Product) => {
    if (product.stock_quantity <= 0) return { status: 'out', color: 'destructive' }
    if (product.stock_quantity <= product.low_stock_threshold) return { status: 'low', color: 'warning' }
    return { status: 'good', color: 'default' }
  }

  const lowStockCount = products.filter(p => p.stock_quantity <= p.low_stock_threshold).length
  const outOfStockCount = products.filter(p => p.stock_quantity <= 0).length

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading inventory...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Inventory Management</h1>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{lowStockCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{outOfStockCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{alerts.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{alerts.length} inventory alert{alerts.length > 1 ? 's' : ''}:</strong>
            <ul className="mt-2 space-y-1">
              {alerts.slice(0, 3).map((alert) => (
                <li key={alert.id} className="text-sm">{alert.message}</li>
              ))}
              {alerts.length > 3 && (
                <li className="text-sm text-muted-foreground">
                  ...and {alerts.length - 3} more
                </li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant={showLowStock ? "default" : "outline"}
          onClick={() => setShowLowStock(!showLowStock)}
        >
          <Filter className="w-4 h-4 mr-2" />
          Low Stock Only
        </Button>
      </div>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>Product Inventory</CardTitle>
          <CardDescription>
            Manage stock levels and track inventory changes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Seller</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Threshold</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => {
                const stockStatus = getStockStatus(product)
                return (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.sku || 'N/A'}</TableCell>
                    <TableCell>{product.sellers?.business_name || 'N/A'}</TableCell>
                    <TableCell>{product.stock_quantity}</TableCell>
                    <TableCell>{product.low_stock_threshold}</TableCell>
                    <TableCell>
                      <Badge variant={stockStatus.color as any}>
                        {stockStatus.status === 'out' && 'Out of Stock'}
                        {stockStatus.status === 'low' && 'Low Stock'}
                        {stockStatus.status === 'good' && 'In Stock'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedProduct(product)}
                          >
                            Adjust Stock
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Adjust Stock - {selectedProduct?.name}</DialogTitle>
                            <DialogDescription>
                              Current stock: {selectedProduct?.stock_quantity}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium">Operation</label>
                              <Select value={adjustmentOperation} onValueChange={(value: any) => setAdjustmentOperation(value)}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="set">Set to</SelectItem>
                                  <SelectItem value="add">Add</SelectItem>
                                  <SelectItem value="subtract">Subtract</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Quantity</label>
                              <Input
                                type="number"
                                value={adjustmentQuantity}
                                onChange={(e) => setAdjustmentQuantity(e.target.value)}
                                placeholder="Enter quantity"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Notes (optional)</label>
                              <Textarea
                                value={adjustmentNotes}
                                onChange={(e) => setAdjustmentNotes(e.target.value)}
                                placeholder="Reason for adjustment"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button onClick={handleStockAdjustment} disabled={isAdjusting}>
                                {isAdjusting ? 'Adjusting...' : 'Adjust Stock'}
                              </Button>
                              <Button variant="outline" onClick={() => setSelectedProduct(null)}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

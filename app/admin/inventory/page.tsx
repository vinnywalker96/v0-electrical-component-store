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
import { useLanguage } from '@/lib/context/language-context'

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
  const { t } = useLanguage()
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
      if (!response.ok) throw new Error(t("admin_inventory.error_fetching"))

      const data = await response.json()
      setProducts(data.products || [])
      setAlerts(data.alerts || [])
    } catch (error) {
      console.error('Error fetching inventory:', error)
      toast.error(t("admin_inventory.error_loading"))
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

      if (!response.ok) throw new Error(t("admin_inventory.error_adjusting"))

      toast.success(t("admin_inventory.adjust_success"))
      setSelectedProduct(null)
      setAdjustmentQuantity('')
      setAdjustmentNotes('')
      fetchInventory()
    } catch (error) {
      console.error('Error adjusting stock:', error)
      toast.error(t("admin_inventory.error_adjusting"))
    } finally {
      setIsAdjusting(false)
    }
  }

  const getStockStatus = (product: Product) => {
    if (product.stock_quantity <= 0) return { status: 'out', color: 'destructive', label: t("admin_inventory.out_of_stock") }
    if (product.stock_quantity <= product.low_stock_threshold) return { status: 'low', color: 'warning', label: t("admin_inventory.low_stock") }
    return { status: 'good', color: 'default', label: t("admin_inventory.in_stock") }
  }

  const lowStockCount = products.filter(p => p.stock_quantity <= p.low_stock_threshold).length
  const outOfStockCount = products.filter(p => p.stock_quantity <= 0).length

  if (loading) {
    return <div className="flex justify-center items-center h-64">{t("admin_inventory.loading")}</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{t("admin_inventory.title")}</h1>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          {t("admin_inventory.add_product")}
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("admin_inventory.total_products")}</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("admin_inventory.low_stock")}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{lowStockCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("admin_inventory.out_of_stock")}</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{outOfStockCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("admin_inventory.alerts")}</CardTitle>
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
            <strong>{alerts.length} {t("admin_inventory.alerts_title")}:</strong>
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
            placeholder={t("admin_inventory.search_placeholder")}
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
          {t("admin_inventory.low_stock_only")}
        </Button>
      </div>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("admin_inventory.product_inventory")}</CardTitle>
          <CardDescription>
            {t("admin_inventory.manage_stock")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin_inventory.product")}</TableHead>
                <TableHead>{t("admin_inventory.sku")}</TableHead>
                <TableHead>{t("admin_inventory.seller")}</TableHead>
                <TableHead>{t("admin_inventory.stock")}</TableHead>
                <TableHead>{t("admin_inventory.threshold")}</TableHead>
                <TableHead>{t("admin_inventory.status")}</TableHead>
                <TableHead>{t("admin_inventory.actions")}</TableHead>
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
                        {stockStatus.label}
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
                            {t("admin_inventory.adjust_stock")}
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{t("admin_inventory.adjust_stock")} - {selectedProduct?.name}</DialogTitle>
                            <DialogDescription>
                              {t("admin_inventory.current_stock")} {selectedProduct?.stock_quantity}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium">{t("admin_inventory.operation")}</label>
                              <Select value={adjustmentOperation} onValueChange={(value: any) => setAdjustmentOperation(value)}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="set">{t("admin_inventory.set_to")}</SelectItem>
                                  <SelectItem value="add">{t("admin_inventory.add")}</SelectItem>
                                  <SelectItem value="subtract">{t("admin_inventory.subtract")}</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="text-sm font-medium">{t("admin_inventory.quantity")}</label>
                              <Input
                                type="number"
                                value={adjustmentQuantity}
                                onChange={(e) => setAdjustmentQuantity(e.target.value)}
                                placeholder={t("admin_inventory.quantity_placeholder")}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">{t("admin_inventory.notes")}</label>
                              <Textarea
                                value={adjustmentNotes}
                                onChange={(e) => setAdjustmentNotes(e.target.value)}
                                placeholder={t("admin_inventory.notes_placeholder")}
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button onClick={handleStockAdjustment} disabled={isAdjusting}>
                                {isAdjusting ? t("admin_inventory.adjusting") : t("admin_inventory.adjust_stock")}
                              </Button>
                              <Button variant="outline" onClick={() => setSelectedProduct(null)}>
                                {t("admin_inventory.cancel")}
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

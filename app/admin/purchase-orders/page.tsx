'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Plus, Search, Truck, Package, CheckCircle, XCircle } from 'lucide-react'

interface PurchaseOrder {
  id: string
  order_number: string
  status: string
  total_amount: number
  currency: string
  expected_delivery_date: string
  actual_delivery_date: string
  notes: string
  created_at: string
  vendor: {
    id: string
    business_name: string
    email: string
  }
  items: Array<{
    id: string
    quantity_ordered: number
    quantity_received: number
    unit_cost: number
    total_cost: number
    product: {
      id: string
      name: string
      sku: string
    }
  }>
}

interface Vendor {
  id: string
  business_name: string
  email: string
}

export default function PurchaseOrdersManagement() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null)

  useEffect(() => {
    fetchPurchaseOrders()
    fetchVendors()
  }, [searchTerm, statusFilter])

  const fetchPurchaseOrders = async () => {
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (statusFilter) params.append('status', statusFilter)

      const response = await fetch(`/api/admin/purchase-orders?${params}`)
      if (!response.ok) throw new Error('Failed to fetch purchase orders')

      const data = await response.json()
      setOrders(data.orders || [])
    } catch (error) {
      console.error('Error fetching purchase orders:', error)
      toast.error('Failed to load purchase orders')
    } finally {
      setLoading(false)
    }
  }

  const fetchVendors = async () => {
    try {
      const response = await fetch('/api/admin/vendors')
      if (!response.ok) throw new Error('Failed to fetch vendors')

      const data = await response.json()
      setVendors(data.vendors || [])
    } catch (error) {
      console.error('Error fetching vendors:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'secondary', icon: Package },
      ordered: { color: 'default', icon: Truck },
      received: { color: 'default', icon: CheckCircle },
      cancelled: { color: 'destructive', icon: XCircle }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    const Icon = config.icon

    return (
      <Badge variant={config.color as any} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/purchase-orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) throw new Error('Failed to update order status')

      toast.success('Order status updated successfully')
      fetchPurchaseOrders()
    } catch (error) {
      console.error('Error updating order status:', error)
      toast.error('Failed to update order status')
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading purchase orders...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Purchase Orders</h1>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Purchase Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Purchase Order</DialogTitle>
              <DialogDescription>
                Create a new purchase order for vendor products
              </DialogDescription>
            </DialogHeader>
            <CreatePurchaseOrderForm
              vendors={vendors}
              onSuccess={() => {
                setShowCreateDialog(false)
                fetchPurchaseOrders()
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {orders.filter(o => o.status === 'pending').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ordered</CardTitle>
            <Truck className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {orders.filter(o => o.status === 'ordered').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Received</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {orders.filter(o => o.status === 'received').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="ordered">Ordered</SelectItem>
            <SelectItem value="received">Received</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Orders</CardTitle>
          <CardDescription>
            Manage vendor purchase orders and track deliveries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Expected Delivery</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.order_number}</TableCell>
                  <TableCell>{order.vendor.business_name}</TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell>${order.total_amount?.toFixed(2)} {order.currency}</TableCell>
                  <TableCell>
                    {order.expected_delivery_date
                      ? new Date(order.expected_delivery_date).toLocaleDateString()
                      : 'N/A'
                    }
                  </TableCell>
                  <TableCell>{order.items?.length || 0} items</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {order.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusUpdate(order.id, 'ordered')}
                        >
                          Mark Ordered
                        </Button>
                      )}
                      {order.status === 'ordered' && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedOrder(order)}
                            >
                              Receive Items
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Receive Items - {order.order_number}</DialogTitle>
                              <DialogDescription>
                                Record received quantities for this purchase order
                              </DialogDescription>
                            </DialogHeader>
                            <ReceiveItemsForm
                              order={selectedOrder}
                              onSuccess={() => {
                                setSelectedOrder(null)
                                fetchPurchaseOrders()
                              }}
                            />
                          </DialogContent>
                        </Dialog>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedOrder(order)}
                      >
                        View Details
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function CreatePurchaseOrderForm({ vendors, onSuccess }: { vendors: Vendor[], onSuccess: () => void }) {
  const [selectedVendor, setSelectedVendor] = useState('')
  const [items, setItems] = useState<Array<{ productId: string; quantity: number; unitCost: number }>>([])
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVendor || items.length === 0) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/admin/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId: selectedVendor,
          items,
          expectedDeliveryDate,
          notes
        })
      })

      if (!response.ok) throw new Error('Failed to create purchase order')

      toast.success('Purchase order created successfully')
      onSuccess()
    } catch (error) {
      console.error('Error creating purchase order:', error)
      toast.error('Failed to create purchase order')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Vendor</label>
        <Select value={selectedVendor} onValueChange={setSelectedVendor}>
          <SelectTrigger>
            <SelectValue placeholder="Select vendor" />
          </SelectTrigger>
          <SelectContent>
            {vendors.map((vendor) => (
              <SelectItem key={vendor.id} value={vendor.id}>
                {vendor.business_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm font-medium">Expected Delivery Date</label>
        <Input
          type="date"
          value={expectedDeliveryDate}
          onChange={(e) => setExpectedDeliveryDate(e.target.value)}
        />
      </div>

      <div>
        <label className="text-sm font-medium">Notes</label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes"
        />
      </div>

      <div>
        <label className="text-sm font-medium">Items</label>
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={index} className="flex gap-2 items-center">
              <Input placeholder="Product ID" value={item.productId} onChange={(e) => {
                const newItems = [...items]
                newItems[index].productId = e.target.value
                setItems(newItems)
              }} />
              <Input
                type="number"
                placeholder="Quantity"
                value={item.quantity}
                onChange={(e) => {
                  const newItems = [...items]
                  newItems[index].quantity = parseInt(e.target.value) || 0
                  setItems(newItems)
                }}
              />
              <Input
                type="number"
                step="0.01"
                placeholder="Unit Cost"
                value={item.unitCost}
                onChange={(e) => {
                  const newItems = [...items]
                  newItems[index].unitCost = parseFloat(e.target.value) || 0
                  setItems(newItems)
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setItems(items.filter((_, i) => i !== index))}
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => setItems([...items, { productId: '', quantity: 1, unitCost: 0 }])}
          >
            Add Item
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Order'}
        </Button>
      </div>
    </form>
  )
}

function ReceiveItemsForm({ order, onSuccess }: { order: PurchaseOrder | null, onSuccess: () => void }) {
  const [receivedQuantities, setReceivedQuantities] = useState<Record<string, number>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (order) {
      const initial: Record<string, number> = {}
      order.items.forEach(item => {
        initial[item.id] = item.quantity_received || 0
      })
      setReceivedQuantities(initial)
    }
  }, [order])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!order) return

    setIsSubmitting(true)
    try {
      const items = Object.entries(receivedQuantities).map(([itemId, quantity]) => ({
        itemId,
        quantityReceived: quantity
      }))

      const response = await fetch(`/api/admin/purchase-orders/${order.id}/receive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      })

      if (!response.ok) throw new Error('Failed to receive items')

      toast.success('Items received successfully')
      onSuccess()
    } catch (error) {
      console.error('Error receiving items:', error)
      toast.error('Failed to receive items')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!order) return null

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-4">
        {order.items.map((item) => (
          <div key={item.id} className="flex items-center justify-between p-4 border rounded">
            <div>
              <p className="font-medium">{item.product.name}</p>
              <p className="text-sm text-muted-foreground">SKU: {item.product.sku}</p>
              <p className="text-sm">Ordered: {item.quantity_ordered}</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm">Received:</label>
              <Input
                type="number"
                min="0"
                max={item.quantity_ordered}
                value={receivedQuantities[item.id] || 0}
                onChange={(e) => setReceivedQuantities({
                  ...receivedQuantities,
                  [item.id]: parseInt(e.target.value) || 0
                })}
                className="w-20"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Receiving...' : 'Receive Items'}
        </Button>
      </div>
    </form>
  )
}

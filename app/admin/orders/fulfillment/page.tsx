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
import { Truck, Package, CheckCircle, Clock, Search, Filter } from 'lucide-react'

interface Order {
  id: string
  order_number: string
  status: string
  fulfillment_status: string
  total_amount: number
  currency: string
  tracking_number: string
  carrier: string
  shipped_at: string
  delivered_at: string
  estimated_delivery_date: string
  created_at: string
  user: {
    id: string
    full_name: string
    email: string
  }
  items: Array<{
    id: string
    quantity: number
    price: number
    product: {
      id: string
      name: string
      sku: string
    }
  }>
}

export default function OrderFulfillment() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('processing')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [fulfillmentData, setFulfillmentData] = useState({
    fulfillmentStatus: '',
    trackingNumber: '',
    carrier: '',
    estimatedDeliveryDate: '',
    notes: ''
  })
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    fetchOrders()
  }, [statusFilter, searchTerm])

  const fetchOrders = async () => {
    try {
      const params = new URLSearchParams()
      params.append('status', statusFilter)
      if (searchTerm) params.append('search', searchTerm)

      const response = await fetch(`/api/admin/orders/fulfillment?${params}`)
      if (!response.ok) throw new Error('Failed to fetch orders')

      const data = await response.json()
      setOrders(data.orders || [])
    } catch (error) {
      console.error('Error fetching orders:', error)
      toast.error('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  const handleFulfillmentUpdate = async () => {
    if (!selectedOrder) return

    setIsUpdating(true)
    try {
      const response = await fetch('/api/admin/orders/fulfillment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          ...fulfillmentData
        })
      })

      if (!response.ok) throw new Error('Failed to update fulfillment')

      toast.success('Order fulfillment updated successfully')
      setSelectedOrder(null)
      setFulfillmentData({
        fulfillmentStatus: '',
        trackingNumber: '',
        carrier: '',
        estimatedDeliveryDate: '',
        notes: ''
      })
      fetchOrders()
    } catch (error) {
      console.error('Error updating fulfillment:', error)
      toast.error('Failed to update fulfillment')
    } finally {
      setIsUpdating(false)
    }
  }

  const getFulfillmentBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'secondary', icon: Clock },
      processing: { color: 'default', icon: Package },
      shipped: { color: 'default', icon: Truck },
      delivered: { color: 'default', icon: CheckCircle },
      cancelled: { color: 'destructive', icon: Package }
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

  const getProcessingStats = () => {
    const processing = orders.filter(o => o.fulfillment_status === 'processing').length
    const shipped = orders.filter(o => o.fulfillment_status === 'shipped').length
    const delivered = orders.filter(o => o.fulfillment_status === 'delivered').length

    return { processing, shipped, delivered }
  }

  const stats = getProcessingStats()

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading orders...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Order Fulfillment</h1>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.processing}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shipped</CardTitle>
            <Truck className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.shipped}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.delivered}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
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
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Orders to Fulfill</CardTitle>
          <CardDescription>
            Manage order fulfillment and shipping
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.order_number}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{order.user.full_name}</p>
                      <p className="text-sm text-muted-foreground">{order.user.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>{getFulfillmentBadge(order.fulfillment_status)}</TableCell>
                  <TableCell>${order.total_amount?.toFixed(2)} {order.currency}</TableCell>
                  <TableCell>{order.items?.length || 0} items</TableCell>
                  <TableCell>
                    {new Date(order.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedOrder(order)}
                        >
                          Update Status
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Fulfill Order {order.order_number}</DialogTitle>
                          <DialogDescription>
                            Update fulfillment status and shipping information
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium">Fulfillment Status</label>
                            <Select
                              value={fulfillmentData.fulfillmentStatus}
                              onValueChange={(value) => setFulfillmentData({
                                ...fulfillmentData,
                                fulfillmentStatus: value
                              })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="processing">Processing</SelectItem>
                                <SelectItem value="shipped">Shipped</SelectItem>
                                <SelectItem value="delivered">Delivered</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {(fulfillmentData.fulfillmentStatus === 'shipped' || fulfillmentData.fulfillmentStatus === 'delivered') && (
                            <>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium">Tracking Number</label>
                                  <Input
                                    value={fulfillmentData.trackingNumber}
                                    onChange={(e) => setFulfillmentData({
                                      ...fulfillmentData,
                                      trackingNumber: e.target.value
                                    })}
                                    placeholder="Enter tracking number"
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Carrier</label>
                                  <Select
                                    value={fulfillmentData.carrier}
                                    onValueChange={(value) => setFulfillmentData({
                                      ...fulfillmentData,
                                      carrier: value
                                    })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select carrier" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="UPS">UPS</SelectItem>
                                      <SelectItem value="FedEx">FedEx</SelectItem>
                                      <SelectItem value="USPS">USPS</SelectItem>
                                      <SelectItem value="DHL">DHL</SelectItem>
                                      <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              <div>
                                <label className="text-sm font-medium">Estimated Delivery Date</label>
                                <Input
                                  type="date"
                                  value={fulfillmentData.estimatedDeliveryDate}
                                  onChange={(e) => setFulfillmentData({
                                    ...fulfillmentData,
                                    estimatedDeliveryDate: e.target.value
                                  })}
                                />
                              </div>
                            </>
                          )}

                          <div>
                            <label className="text-sm font-medium">Notes (optional)</label>
                            <Textarea
                              value={fulfillmentData.notes}
                              onChange={(e) => setFulfillmentData({
                                ...fulfillmentData,
                                notes: e.target.value
                              })}
                              placeholder="Additional notes"
                            />
                          </div>

                          <div className="flex gap-2">
                            <Button onClick={handleFulfillmentUpdate} disabled={isUpdating}>
                              {isUpdating ? 'Updating...' : 'Update Fulfillment'}
                            </Button>
                            <Button variant="outline" onClick={() => setSelectedOrder(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
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
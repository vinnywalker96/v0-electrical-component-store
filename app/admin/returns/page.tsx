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
import { RotateCcw, CheckCircle, XCircle, Clock, Package, Search, Filter } from 'lucide-react'

interface ReturnRequest {
  id: string
  order_id: string
  reason: string
  description: string
  status: string
  refund_amount: number
  refund_method: string
  return_tracking_number: string
  return_carrier: string
  admin_notes: string
  requested_at: string
  processed_at: string
  completed_at: string
  order: {
    id: string
    order_number: string
    total_amount: number
    user: {
      id: string
      full_name: string
      email: string
    }
  }
  items: Array<{
    id: string
    quantity: number
    condition: string
    reason: string
    refund_amount: number
    order_item: {
      product: {
        id: string
        name: string
        sku: string
      }
    }
  }>
}

export default function ReturnsManagement() {
  const [returns, setReturns] = useState<ReturnRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null)
  const [returnData, setReturnData] = useState({
    status: '',
    refundMethod: '',
    returnTrackingNumber: '',
    returnCarrier: '',
    adminNotes: ''
  })
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    fetchReturns()
  }, [statusFilter, searchTerm])

  const fetchReturns = async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.append('status', statusFilter)
      if (searchTerm) params.append('search', searchTerm)

      const response = await fetch(`/api/admin/returns?${params}`)
      if (!response.ok) throw new Error('Failed to fetch returns')

      const data = await response.json()
      setReturns(data.returns || [])
    } catch (error) {
      console.error('Error fetching returns:', error)
      toast.error('Failed to load returns')
    } finally {
      setLoading(false)
    }
  }

  const handleReturnUpdate = async () => {
    if (!selectedReturn) return

    setIsUpdating(true)
    try {
      const response = await fetch(`/api/admin/returns/${selectedReturn.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(returnData)
      })

      if (!response.ok) throw new Error('Failed to update return')

      toast.success('Return request updated successfully')
      setSelectedReturn(null)
      setReturnData({
        status: '',
        refundMethod: '',
        returnTrackingNumber: '',
        returnCarrier: '',
        adminNotes: ''
      })
      fetchReturns()
    } catch (error) {
      console.error('Error updating return:', error)
      toast.error('Failed to update return')
    } finally {
      setIsUpdating(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'secondary', icon: Clock },
      approved: { color: 'default', icon: CheckCircle },
      rejected: { color: 'destructive', icon: XCircle },
      received: { color: 'default', icon: Package },
      refunded: { color: 'default', icon: RotateCcw },
      completed: { color: 'default', icon: CheckCircle }
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

  const getReasonBadge = (reason: string) => {
    const reasonLabels = {
      defective: 'Defective',
      wrong_item: 'Wrong Item',
      not_as_described: 'Not as Described',
      changed_mind: 'Changed Mind',
      other: 'Other'
    }

    return (
      <Badge variant="outline">
        {reasonLabels[reason as keyof typeof reasonLabels] || reason}
      </Badge>
    )
  }

  const getProcessingStats = () => {
    const pending = returns.filter(r => r.status === 'pending').length
    const approved = returns.filter(r => r.status === 'approved').length
    const completed = returns.filter(r => r.status === 'completed').length
    const rejected = returns.filter(r => r.status === 'rejected').length

    return { pending, approved, completed, rejected }
  }

  const stats = getProcessingStats()

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading returns...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Returns Management</h1>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.approved}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search returns..."
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
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="received">Received</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Returns Table */}
      <Card>
        <CardHeader>
          <CardTitle>Return Requests</CardTitle>
          <CardDescription>
            Manage customer return requests and refunds
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Refund Amount</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {returns.map((returnRequest) => (
                <TableRow key={returnRequest.id}>
                  <TableCell className="font-medium">
                    {returnRequest.order.order_number}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{returnRequest.order.user.full_name}</p>
                      <p className="text-sm text-muted-foreground">{returnRequest.order.user.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>{getReasonBadge(returnRequest.reason)}</TableCell>
                  <TableCell>{getStatusBadge(returnRequest.status)}</TableCell>
                  <TableCell>
                    {returnRequest.refund_amount
                      ? `$${returnRequest.refund_amount.toFixed(2)}`
                      : 'N/A'
                    }
                  </TableCell>
                  <TableCell>
                    {new Date(returnRequest.requested_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedReturn(returnRequest)}
                        >
                          Process Return
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Process Return Request</DialogTitle>
                          <DialogDescription>
                            Order: {returnRequest.order.order_number} - {returnRequest.order.user.full_name}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          {/* Return Details */}
                          <div className="p-4 bg-gray-50 rounded">
                            <h4 className="font-medium mb-2">Return Details</h4>
                            <p><strong>Reason:</strong> {getReasonBadge(returnRequest.reason)}</p>
                            <p><strong>Description:</strong> {returnRequest.description || 'N/A'}</p>
                            <p><strong>Items:</strong> {returnRequest.items?.length || 0} items</p>
                          </div>

                          {/* Items List */}
                          <div>
                            <h4 className="font-medium mb-2">Items</h4>
                            <div className="space-y-2">
                              {returnRequest.items?.map((item) => (
                                <div key={item.id} className="flex justify-between items-center p-2 border rounded">
                                  <div>
                                    <p className="font-medium">{item.order_item.product.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                      SKU: {item.order_item.product.sku} | Qty: {item.quantity} | Condition: {item.condition}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    {item.refund_amount && (
                                      <p className="font-medium">${item.refund_amount.toFixed(2)}</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="text-sm font-medium">Status</label>
                            <Select
                              value={returnData.status}
                              onValueChange={(value) => setReturnData({
                                ...returnData,
                                status: value
                              })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Update status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="approved">Approve</SelectItem>
                                <SelectItem value="rejected">Reject</SelectItem>
                                <SelectItem value="received">Mark as Received</SelectItem>
                                <SelectItem value="refunded">Process Refund</SelectItem>
                                <SelectItem value="completed">Complete</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {(returnData.status === 'refunded' || returnData.status === 'completed') && (
                            <div>
                              <label className="text-sm font-medium">Refund Method</label>
                              <Select
                                value={returnData.refundMethod}
                                onValueChange={(value) => setReturnData({
                                  ...returnData,
                                  refundMethod: value
                                })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select refund method" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="original_payment">Original Payment Method</SelectItem>
                                  <SelectItem value="store_credit">Store Credit</SelectItem>
                                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {(returnData.status === 'received' || returnData.status === 'approved') && (
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium">Return Tracking Number</label>
                                <Input
                                  value={returnData.returnTrackingNumber}
                                  onChange={(e) => setReturnData({
                                    ...returnData,
                                    returnTrackingNumber: e.target.value
                                  })}
                                  placeholder="Enter tracking number"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium">Return Carrier</label>
                                <Select
                                  value={returnData.returnCarrier}
                                  onValueChange={(value) => setReturnData({
                                    ...returnData,
                                    returnCarrier: value
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
                          )}

                          <div>
                            <label className="text-sm font-medium">Admin Notes</label>
                            <Textarea
                              value={returnData.adminNotes}
                              onChange={(e) => setReturnData({
                                ...returnData,
                                adminNotes: e.target.value
                              })}
                              placeholder="Internal notes"
                            />
                          </div>

                          <div className="flex gap-2">
                            <Button onClick={handleReturnUpdate} disabled={isUpdating}>
                              {isUpdating ? 'Updating...' : 'Update Return'}
                            </Button>
                            <Button variant="outline" onClick={() => setSelectedReturn(null)}>
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

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logging/logger'
import { z } from 'zod'

// Validation schemas
const updateInventorySchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int(),
  operation: z.enum(['set', 'add', 'subtract']),
  notes: z.string().optional()
})

const createPurchaseOrderSchema = z.object({
  vendorId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
    unitCost: z.number().positive().optional()
  })),
  expectedDeliveryDate: z.string().optional(),
  notes: z.string().optional()
})

// GET /api/admin/inventory - Get inventory overview
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit
    const search = searchParams.get('search')
    const lowStock = searchParams.get('lowStock') === 'true'

    // Build query
    let query = supabase
      .from('products')
      .select(`
        id,
        name,
        sku,
        stock_quantity,
        low_stock_threshold,
        track_inventory,
        allow_backorders,
        price,
        sellers (
          id,
          business_name
        )
      `)
      .eq('track_inventory', true)
      .range(offset, offset + limit - 1)

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    if (lowStock) {
      query = query.or(`stock_quantity.lte.low_stock_threshold,stock_quantity.eq.0`)
    }

    const { data: products, error, count } = await query

    if (error) {
      logger.error('Failed to fetch inventory', error)
      return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 })
    }

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('track_inventory', true)

    // Get low stock alerts
    const { data: alerts } = await supabase
      .from('inventory_alerts')
      .select('*')
      .eq('is_read', false)
      .order('created_at', { ascending: false })

    return NextResponse.json({
      products,
      alerts,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    })

  } catch (error) {
    logger.error('Inventory API error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/inventory - Update inventory
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const validatedData = updateInventorySchema.parse(body)
    const { productId, quantity, operation, notes } = validatedData

    // Get current product data
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('stock_quantity, name')
      .eq('id', productId)
      .single()

    if (fetchError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const previousQuantity = product.stock_quantity
    let newQuantity = previousQuantity

    switch (operation) {
      case 'set':
        newQuantity = quantity
        break
      case 'add':
        newQuantity = previousQuantity + quantity
        break
      case 'subtract':
        newQuantity = Math.max(0, previousQuantity - quantity)
        break
    }

    // Update product stock
    const { error: updateError } = await supabase
      .from('products')
      .update({ stock_quantity: newQuantity })
      .eq('id', productId)

    if (updateError) {
      logger.error('Failed to update inventory', updateError)
      return NextResponse.json({ error: 'Failed to update inventory' }, { status: 500 })
    }

    // Record transaction
    const { error: transactionError } = await supabase
      .from('inventory_transactions')
      .insert({
        product_id: productId,
        transaction_type: 'adjustment',
        quantity: newQuantity - previousQuantity,
        previous_quantity: previousQuantity,
        new_quantity: newQuantity,
        reference_type: 'manual_adjustment',
        notes: notes || `Manual ${operation} adjustment`
      })

    if (transactionError) {
      logger.warn('Failed to record inventory transaction', transactionError)
    }

    // Check for alerts
    if (newQuantity <= 0 || newQuantity <= (product.low_stock_threshold || 10)) {
      const alertType = newQuantity <= 0 ? 'out_of_stock' : 'low_stock'
      const message = newQuantity <= 0
        ? `${product.name} is out of stock`
        : `${product.name} is low on stock (${newQuantity} remaining)`

      await supabase
        .from('inventory_alerts')
        .insert({
          product_id: productId,
          alert_type: alertType,
          threshold: product.low_stock_threshold || 10,
          current_quantity: newQuantity,
          message
        })
    }

    logger.info('Inventory updated', {
      productId,
      operation,
      previousQuantity,
      newQuantity,
      notes
    })

    return NextResponse.json({
      success: true,
      productId,
      previousQuantity,
      newQuantity
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input data', details: error.errors }, { status: 400 })
    }

    logger.error('Inventory update error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

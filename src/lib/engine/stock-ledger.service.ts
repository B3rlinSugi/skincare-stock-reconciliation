// src/lib/engine/stock-ledger.service.ts
// THE CORE ENGINE — Semua pergerakan stok wajib lewat sini
// Append-only: tidak ada UPDATE, tidak ada DELETE

import { supabaseAdmin } from '@/lib/db/client'
import type {
  LedgerEntryInput,
  StockLedger,
  ProductStockSummary,
  BatchStock,
  DrilldownReport,
  MovementBreakdown,
  ConsistencyReport,
  MovementChannel,
  MovementType,
} from '@/lib/types'

export class StockLedgerService {
  /**
   * Append satu entry ke ledger.
   * INI SATU-SATUNYA CARA stok berubah. Tidak ada jalan lain.
   */
  static async appendEntry(entry: LedgerEntryInput): Promise<StockLedger> {
    // Validasi: quantity tidak boleh 0
    if (entry.quantity === 0) {
      throw new Error('Ledger entry quantity cannot be zero')
    }

    // Validasi: OUTBOUND harus negative, INBOUND harus positive
    if (entry.movement_type === 'INBOUND' && entry.quantity < 0) {
      throw new Error('INBOUND movement must have positive quantity')
    }
    if (entry.movement_type === 'OUTBOUND' && entry.quantity > 0) {
      throw new Error('OUTBOUND movement must have negative quantity')
    }

    // Validasi: cek stok cukup sebelum OUTBOUND
    if (entry.movement_type === 'OUTBOUND' && entry.batch_id) {
      const currentStock = await this.computeStock(entry.product_id, entry.batch_id)
      if (currentStock + entry.quantity < 0) {
        throw new Error(
          `Insufficient stock for product ${entry.product_id} batch ${entry.batch_id}. ` +
          `Available: ${currentStock}, Required: ${Math.abs(entry.quantity)}`
        )
      }
    }

    const { data, error } = await supabaseAdmin
      .from('stock_ledger')
      .insert({
        product_id: entry.product_id,
        batch_id: entry.batch_id ?? null,
        movement_type: entry.movement_type,
        channel: entry.channel,
        quantity: entry.quantity,
        reference_type: entry.reference_type ?? null,
        reference_id: entry.reference_id ?? null,
        return_condition: entry.return_condition ?? null,
        notes: entry.notes ?? null,
        created_by: entry.created_by ?? 'system',
      })
      .select()
      .single()

    if (error) throw new Error(`Ledger append failed: ${error.message}`)
    return data as StockLedger
  }

  /**
   * Append multiple entries dalam satu operasi (untuk FEFO multi-batch allocation)
   */
  static async appendEntries(entries: LedgerEntryInput[]): Promise<StockLedger[]> {
    if (entries.length === 0) return []

    const rows = entries.map(e => ({
      product_id: e.product_id,
      batch_id: e.batch_id ?? null,
      movement_type: e.movement_type,
      channel: e.channel,
      quantity: e.quantity,
      reference_type: e.reference_type ?? null,
      reference_id: e.reference_id ?? null,
      return_condition: e.return_condition ?? null,
      notes: e.notes ?? null,
      created_by: e.created_by ?? 'system',
    }))

    const { data, error } = await supabaseAdmin
      .from('stock_ledger')
      .insert(rows)
      .select()

    if (error) throw new Error(`Bulk ledger append failed: ${error.message}`)
    return data as StockLedger[]
  }

  /**
   * Hitung stok saat ini untuk satu produk + batch.
   * TIDAK PERNAH disimpan — selalu computed dari ledger.
   */
  static async computeStock(productId: string, batchId?: string): Promise<number> {
    let query = supabaseAdmin
      .from('stock_ledger')
      .select('quantity')
      .eq('product_id', productId)

    if (batchId) {
      query = query.eq('batch_id', batchId)
    }

    const { data, error } = await query
    if (error) throw new Error(`computeStock failed: ${error.message}`)

    return (data as { quantity: number }[]).reduce((sum, row) => sum + row.quantity, 0)
  }

  /**
   * Hitung stok semua produk — digunakan untuk dashboard
   */
  static async computeAllStocks(): Promise<ProductStockSummary[]> {
    const { data, error } = await supabaseAdmin
      .from('v_current_stock')
      .select('*')

    if (error) throw new Error(`computeAllStocks failed: ${error.message}`)

    const today = new Date()
    const soon = new Date()
    soon.setDate(today.getDate() + 90) // warning 90 hari sebelum expiry

    // Group by product
    const productMap = new Map<string, ProductStockSummary>()

    for (const row of (data as {
      product_id: string; sku: string; product_name: string;
      batch_id: string; batch_code: string; expiry_date: string; current_qty: number
    }[])) {
      if (!productMap.has(row.product_id)) {
        productMap.set(row.product_id, {
          product_id: row.product_id,
          sku: row.sku,
          product_name: row.product_name,
          total_qty: 0,
          batches: [],
          has_expiring_soon: false,
          earliest_expiry: null,
        })
      }

      const product = productMap.get(row.product_id)!
      const expiryDate = new Date(row.expiry_date)
      const isExpiringSoon = expiryDate <= soon && expiryDate > today
      const isExpired = expiryDate <= today

      const batchStock: BatchStock = {
        batch_id: row.batch_id,
        batch_code: row.batch_code,
        expiry_date: row.expiry_date,
        current_qty: row.current_qty,
        is_expiring_soon: isExpiringSoon,
        is_expired: isExpired,
      }

      product.batches.push(batchStock)
      product.total_qty += row.current_qty

      if (isExpiringSoon) product.has_expiring_soon = true

      if (!product.earliest_expiry || row.expiry_date < product.earliest_expiry) {
        product.earliest_expiry = row.expiry_date
      }
    }

    return Array.from(productMap.values())
  }

  /**
   * Ambil semua movements untuk satu produk — untuk drill-down reconciliation
   */
  static async getMovements(
    productId: string,
    options?: {
      from?: string
      to?: string
      channel?: MovementChannel
      movement_type?: MovementType
      limit?: number
    }
  ): Promise<StockLedger[]> {
    let query = supabaseAdmin
      .from('stock_ledger')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })

    if (options?.from) query = query.gte('created_at', options.from)
    if (options?.to) query = query.lte('created_at', options.to)
    if (options?.channel) query = query.eq('channel', options.channel)
    if (options?.movement_type) query = query.eq('movement_type', options.movement_type)
    if (options?.limit) query = query.limit(options.limit)

    const { data, error } = await query
    if (error) throw new Error(`getMovements failed: ${error.message}`)
    return data as StockLedger[]
  }

  /**
   * Drill-down report: kenapa stok produk ini berubah?
   */
  static async getDrilldownReport(
    productId: string,
    from: string,
    to: string
  ): Promise<DrilldownReport> {
    const [product, movements, openingStock] = await Promise.all([
      supabaseAdmin.from('products').select('id, name').eq('id', productId).single(),
      this.getMovements(productId, { from, to }),
      supabaseAdmin
        .from('stock_ledger')
        .select('quantity')
        .eq('product_id', productId)
        .lt('created_at', from),
    ])

    if (product.error) throw new Error(product.error.message)

    const openingQty = (openingStock.data as { quantity: number }[] ?? [])
      .reduce((sum, r) => sum + r.quantity, 0)

    const periodQty = movements.reduce((sum, m) => sum + m.quantity, 0)

    // Breakdown per channel + movement_type
    const breakdownMap = new Map<string, MovementBreakdown>()
    for (const m of movements) {
      const key = `${m.channel}|${m.movement_type}`
      if (!breakdownMap.has(key)) {
        breakdownMap.set(key, {
          channel: m.channel,
          movement_type: m.movement_type,
          total_qty: 0,
          entry_count: 0,
        })
      }
      const b = breakdownMap.get(key)!
      b.total_qty += m.quantity
      b.entry_count += 1
    }

    const totalInbound = movements
      .filter(m => m.quantity > 0)
      .reduce((sum, m) => sum + m.quantity, 0)

    const totalOutbound = movements
      .filter(m => m.quantity < 0)
      .reduce((sum, m) => sum + m.quantity, 0)

    return {
      product_id: productId,
      product_name: (product.data as { id: string; name: string }).name,
      period_start: from,
      period_end: to,
      opening_stock: openingQty,
      closing_stock: openingQty + periodQty,
      total_inbound: totalInbound,
      total_outbound: Math.abs(totalOutbound),
      breakdown: Array.from(breakdownMap.values()),
      ledger_entries: movements,
    }
  }

  /**
   * Validasi konsistensi ledger:
   * - Stok tidak boleh negatif per batch
   * - Reference IDs harus valid
   */
  static async validateConsistency(): Promise<ConsistencyReport> {
    const { data: stockData } = await supabaseAdmin
      .from('v_current_stock')
      .select('product_id, batch_id, current_qty')

    const negativeItems = (stockData as {
      product_id: string; batch_id: string; current_qty: number
    }[] ?? [])
      .filter(s => s.current_qty < 0)
      .map(s => ({
        product_id: s.product_id,
        batch_id: s.batch_id,
        qty: s.current_qty,
      }))

    return {
      is_consistent: negativeItems.length === 0,
      negative_stock_items: negativeItems,
      orphan_references: [], // expanded in future
    }
  }
}

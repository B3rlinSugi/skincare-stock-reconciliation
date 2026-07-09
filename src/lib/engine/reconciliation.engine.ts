// src/lib/engine/reconciliation.engine.ts
// Reconciliation Engine — bukan sekedar tampilkan selisih,
// tapi TELUSURI kenapa selisih itu terjadi sampai ke akarnya.

import { supabaseAdmin } from '@/lib/db/client'
import { StockLedgerService } from './stock-ledger.service'
import type {
  DailyReconciliationReport,
  AnomalyFlag,
  GapBreakdown,
} from '@/lib/types'

export class ReconciliationEngine {
  /**
   * Daily reconciliation: cek konsistensi internal ledger
   * Jalankan setiap hari via cron (atau manual dari dashboard)
   */
  static async runDailyCheck(): Promise<DailyReconciliationReport> {
    const today = new Date().toISOString().split('T')[0]
    const anomalies: AnomalyFlag[] = []

    // 1. Cek konsistensi ledger (stok negatif)
    const consistency = await StockLedgerService.validateConsistency()
    for (const item of consistency.negative_stock_items) {
      const { data: product } = await supabaseAdmin
        .from('products')
        .select('name')
        .eq('id', item.product_id)
        .single()

      anomalies.push({
        product_id: item.product_id,
        product_name: (product as { name: string } | null)?.name ?? 'Unknown',
        type: 'NEGATIVE_STOCK',
        description: `Stok negatif terdeteksi: ${item.qty} unit (batch ${item.batch_id})`,
        severity: 'HIGH',
      })
    }

    // 2. Cek retur TikTok yang mendekati deadline (< 7 hari)
    const deadline7 = new Date()
    deadline7.setDate(deadline7.getDate() + 7)

    const { data: urgentReturns } = await supabaseAdmin
      .from('returns')
      .select('*, products(name)')
      .eq('marketplace', 'TIKTOK')
      .eq('claim_submitted', false)
      .eq('status', 'INSPECTED')
      .lte('tiktok_claim_deadline', deadline7.toISOString().split('T')[0])
      .gte('tiktok_claim_deadline', today)

    for (const ret of (urgentReturns ?? []) as {
      id: string; product_id: string; tiktok_claim_deadline: string;
      products: { name: string }
    }[]) {
      const daysLeft = Math.ceil(
        (new Date(ret.tiktok_claim_deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
      anomalies.push({
        product_id: ret.product_id,
        product_name: ret.products?.name ?? 'Unknown',
        type: 'TIKTOK_CLAIM_URGENT',
        description: `Klaim TikTok harus diajukan dalam ${daysLeft} hari (${ret.tiktok_claim_deadline})`,
        severity: daysLeft <= 3 ? 'HIGH' : 'MEDIUM',
      })
    }

    // 3. Cek order CANCELLED yang stok belum dikembalikan
    const { data: cancelledOrders } = await supabaseAdmin
      .from('orders')
      .select('id, external_order_id, marketplace')
      .eq('status', 'CANCELLED')
      .eq('stock_deducted', true) // stok sudah dipotong tapi dibatalkan — perlu dicek

    // Cek apakah ada reversal entry di ledger untuk order ini
    for (const order of (cancelledOrders ?? []) as {
      id: string; external_order_id: string; marketplace: string
    }[]) {
      const { data: reversalEntries } = await supabaseAdmin
        .from('stock_ledger')
        .select('id')
        .eq('reference_type', 'ORDER')
        .eq('reference_id', order.id)
        .eq('movement_type', 'INBOUND') // reversal = INBOUND
        .limit(1)

      if (!reversalEntries || reversalEntries.length === 0) {
        anomalies.push({
          product_id: '',
          product_name: '',
          type: 'CANCELLED_ORDER_NO_REVERSAL',
          description: `Order dibatalkan (${order.external_order_id}) tapi stok belum dikembalikan ke catatan`,
          severity: 'HIGH',
        })
      }
    }

    // 4. Cek barang mendekati kedaluwarsa (< 90 hari)
    const expiry90 = new Date()
    expiry90.setDate(expiry90.getDate() + 90)

    const { data: expiringBatches } = await supabaseAdmin
      .from('v_current_stock')
      .select('product_id, product_name, batch_code, expiry_date, current_qty')
      .gt('current_qty', 0)
      .lte('expiry_date', expiry90.toISOString().split('T')[0])
      .gte('expiry_date', today)

    for (const batch of (expiringBatches ?? []) as {
      product_id: string; product_name: string; batch_code: string;
      expiry_date: string; current_qty: number
    }[]) {
      const daysLeft = Math.ceil(
        (new Date(batch.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
      anomalies.push({
        product_id: batch.product_id,
        product_name: batch.product_name,
        type: 'EXPIRY_WARNING',
        description: `Batch ${batch.batch_code} kedaluwarsa dalam ${daysLeft} hari (${batch.current_qty} unit tersisa)`,
        severity: daysLeft <= 30 ? 'HIGH' : 'MEDIUM',
      })
    }

    // Simpan ke daily_reconciliation_log
    const { data: products } = await supabaseAdmin.from('products').select('id')
    const totalProducts = (products ?? []).length

    // Save anomalies per product
    const productAnomalyMap = new Map<string, AnomalyFlag[]>()
    for (const anomaly of anomalies) {
      if (!anomaly.product_id) continue
      if (!productAnomalyMap.has(anomaly.product_id)) {
        productAnomalyMap.set(anomaly.product_id, [])
      }
      productAnomalyMap.get(anomaly.product_id)!.push(anomaly)
    }

    // Bulk Upsert log per product untuk menghindari timeout (N+1 query problem)
    const affectedProductIds = Array.from(productAnomalyMap.keys())
    
    // Ambil stok untuk semua produk yang terkena anomali sekaligus
    const { data: stockData } = await supabaseAdmin
      .from('v_product_stock_total')
      .select('product_id, total_qty')
      .in('product_id', affectedProductIds)

    const stockMap = new Map(
      (stockData as any[] ?? []).map(s => [s.product_id, s.total_qty])
    )

    const upsertPayload = affectedProductIds.map(productId => ({
      run_date: today,
      product_id: productId,
      computed_stock: stockMap.get(productId) ?? 0,
      anomaly_flags: productAnomalyMap.get(productId),
      has_anomaly: true,
    }))

    if (upsertPayload.length > 0) {
      await supabaseAdmin
        .from('daily_reconciliation_log')
        .upsert(upsertPayload, { onConflict: 'run_date,product_id' })
    }

    return {
      run_date: today,
      total_products: totalProducts,
      products_with_anomaly: productAnomalyMap.size,
      anomalies,
    }
  }

  /**
   * Breakdown gap — untuk satu produk, kenapa ada selisih?
   * Drill-down ke source of each gap type.
   */
  static async getGapBreakdown(
    productId: string,
    physicalQty: number
  ): Promise<GapBreakdown> {
    const systemStock = await StockLedgerService.computeStock(productId)
    const gap = physicalQty - systemStock

    // Hitung setiap sumber potensi gap
    const [cancelledNotRestocked, lostReturns, bonusPromoSample, damagedExpired] =
      await Promise.all([
        // 1. Order CANCELLED tapi stok tidak dikembalikan
        this.computeCancelledNotRestocked(productId),

        // 2. Retur dengan kondisi LOST
        this.computeLostReturns(productId),

        // 3. Bonus + promo + sampel yang keluar
        this.computeBonusPromoSample(productId),

        // 4. Barang rusak dan kedaluwarsa
        this.computeDamagedExpired(productId),
      ])

    const explainedGap =
      cancelledNotRestocked + lostReturns + bonusPromoSample + damagedExpired
    const unexplained = Math.abs(gap) - Math.abs(explainedGap)

    return {
      product_id: productId,
      system_stock: systemStock,
      physical_stock: physicalQty,
      gap,
      gap_sources: {
        cancelled_orders_not_restocked: cancelledNotRestocked,
        lost_returns: lostReturns,
        bonus_promo_sample: bonusPromoSample,
        damaged_expired: damagedExpired,
        unexplained: Math.max(0, unexplained),
      },
    }
  }

  private static async computeCancelledNotRestocked(productId: string): Promise<number> {
    const { data } = await supabaseAdmin
      .from('stock_ledger')
      .select('quantity')
      .eq('product_id', productId)
      .eq('movement_type', 'OUTBOUND')
      .eq('reference_type', 'ORDER')

    if (!data) return 0

    // Ambil order IDs yang sudah di-deduct
    const { data: cancelledOrders } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('status', 'CANCELLED')
      .eq('stock_deducted', true)

    if (!cancelledOrders || cancelledOrders.length === 0) return 0

    const cancelledIds = (cancelledOrders as { id: string }[]).map(o => o.id)

    const { data: unreversed } = await supabaseAdmin
      .from('stock_ledger')
      .select('quantity')
      .eq('product_id', productId)
      .eq('movement_type', 'OUTBOUND')
      .eq('reference_type', 'ORDER')
      .in('reference_id', cancelledIds)

    return Math.abs(
      ((unreversed ?? []) as { quantity: number }[]).reduce((sum, r) => sum + r.quantity, 0)
    )
  }

  private static async computeLostReturns(productId: string): Promise<number> {
    const { data } = await supabaseAdmin
      .from('returns')
      .select('qty')
      .eq('product_id', productId)
      .eq('condition', 'LOST')

    return ((data ?? []) as { qty: number }[]).reduce((sum, r) => sum + r.qty, 0)
  }

  private static async computeBonusPromoSample(productId: string): Promise<number> {
    const { data } = await supabaseAdmin
      .from('stock_ledger')
      .select('quantity')
      .eq('product_id', productId)
      .in('channel', ['BONUS', 'PROMO', 'SAMPLE'])

    return Math.abs(
      ((data ?? []) as { quantity: number }[]).reduce((sum, r) => sum + r.quantity, 0)
    )
  }

  private static async computeDamagedExpired(productId: string): Promise<number> {
    const { data } = await supabaseAdmin
      .from('stock_ledger')
      .select('quantity')
      .eq('product_id', productId)
      .in('channel', ['DAMAGED', 'EXPIRED'])

    return Math.abs(
      ((data ?? []) as { quantity: number }[]).reduce((sum, r) => sum + r.quantity, 0)
    )
  }
}

// src/lib/engine/marketplace-processor.ts
// Event processor — satu kode path untuk simulasi DAN real webhook (masa depan)

import { supabaseAdmin } from '@/lib/db/client'
import { FEFOAllocator } from './fefo-allocator'
import type {
  MarketplaceEvent,
  Marketplace,
  SimOrderCreatedPayload,
  SimOrderStatusPayload,
  SimReturnRequestedPayload,
} from '@/lib/types'

export class MarketplaceProcessor {
  /**
   * Entry point utama untuk semua marketplace events.
   * Dipanggil dari: API route (simulasi) DAN webhook handler (masa depan)
   */
  static async processEvent(eventId: string): Promise<void> {
    // 1. Ambil event dan kunci statusnya menjadi PROCESSING (mencegah duplikasi cron job)
    const { data: event, error } = await supabaseAdmin
      .from('marketplace_events')
      .update({ status: 'PROCESSING', updated_at: new Date().toISOString() })
      .eq('id', eventId)
      .eq('status', 'PENDING') // Hanya proses yang masih PENDING
      .select('*')
      .single()

    // Jika error atau null, berarti event sudah diproses oleh proses lain, atau tidak ada
    if (error || !event) {
      console.warn(`Event ${eventId} not found or already processing/processed.`)
      return
    }

    const e = event as MarketplaceEvent

    try {
      switch (e.event_type) {
        case 'ORDER_CREATED':
          await this.handleOrderCreated(e.payload as unknown as SimOrderCreatedPayload)
          break
        case 'ORDER_SHIPPED':
          await this.handleOrderShipped(e.payload as unknown as SimOrderStatusPayload)
          break
        case 'ORDER_IN_TRANSIT':
          await this.handleOrderInTransit(e.payload as unknown as SimOrderStatusPayload)
          break
        case 'ORDER_CANCELLED':
          await this.handleOrderCancelled(e.payload as unknown as SimOrderStatusPayload)
          break
        case 'RETURN_REQUESTED':
          await this.handleReturnRequested(e.payload as unknown as SimReturnRequestedPayload)
          break
        default:
          throw new Error(`Unknown event type: ${e.event_type}`)
      }

      // 2. Mark as processed jika sukses
      await supabaseAdmin
        .from('marketplace_events')
        .update({ status: 'PROCESSED', processed_at: new Date().toISOString() })
        .eq('id', eventId)

    } catch (err) {
      // 3. Mark as failed jika gagal
      await supabaseAdmin
        .from('marketplace_events')
        .update({
          status: 'FAILED',
          error_msg: err instanceof Error ? err.message : String(err),
          updated_at: new Date().toISOString(),
        })
        .eq('id', eventId)
      throw err
    }
  }

  /**
   * Pesanan masuk → create order record.
   * TIDAK memotong stok. Hanya reservasi.
   */
  private static async handleOrderCreated(payload: SimOrderCreatedPayload): Promise<void> {
    // Resolve bundle items → satuan produk
    const resolvedItems: { product_id: string; qty: number }[] = []
    for (const item of payload.items) {
      if (item.bundle_sku) {
        const bundleItems = await FEFOAllocator.resolveBundle(item.bundle_sku, item.qty)
        resolvedItems.push(...bundleItems)
      } else {
        resolvedItems.push({ product_id: item.product_id, qty: item.qty })
      }
    }

    // Buat order record
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        marketplace: payload.marketplace,
        external_order_id: payload.external_order_id,
        status: 'PENDING',
        customer_name: payload.customer_name,
        stock_deducted: false,
        raw_payload: payload as unknown as Record<string, unknown>,
      })
      .select()
      .single()

    if (orderError) throw new Error(`Create order failed: ${orderError.message}`)

    // Insert order items
    const orderItems = resolvedItems.map(item => ({
      order_id: (order as { id: string }).id,
      product_id: item.product_id,
      qty: item.qty,
    }))

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItems)

    if (itemsError) throw new Error(`Create order items failed: ${itemsError.message}`)
  }

  /**
   * Shopee: SHIPPED → ini saat stok dipotong
   */
  private static async handleOrderShipped(payload: SimOrderStatusPayload): Promise<void> {
    await this.deductStockForOrder(payload.external_order_id, 'SHIPPED')
  }

  /**
   * TikTok: IN_TRANSIT → ini saat stok dipotong
   */
  private static async handleOrderInTransit(payload: SimOrderStatusPayload): Promise<void> {
    await this.deductStockForOrder(payload.external_order_id, 'IN_TRANSIT')
  }

  /**
   * Core logic untuk potong stok — dipanggil oleh SHIPPED (Shopee) dan IN_TRANSIT (TikTok).
   * Kini dialihkan secara penuh ke RPC (Atomic) agar bebas dari split-brain.
   */
  private static async deductStockForOrder(
    externalOrderId: string,
    newStatus: string
  ): Promise<void> {
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('external_order_id', externalOrderId)
      .single()

    if (orderError || !order) throw new Error(`Order not found: ${externalOrderId}`)

    // Gunakan transaksi ACID via RPC untuk mengalokasikan stok FEFO dan merubah status sekaligus.
    const { error: rpcError } = await supabaseAdmin.rpc('rpc_process_order_fefo', {
      p_order_id: order.id,
      p_new_status: newStatus
    })

    if (rpcError) throw new Error(`Process order FEFO failed: ${rpcError.message}`)
  }

  /**
   * Pesanan dibatalkan.
   * Kini ditangani seluruhnya oleh RPC (Atomic) agar tidak ada pengembalian stok setengah-setengah.
   */
  private static async handleOrderCancelled(payload: SimOrderStatusPayload): Promise<void> {
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('external_order_id', payload.external_order_id)
      .single()

    if (error || !order) throw new Error(`Order not found: ${payload.external_order_id}`)

    const { error: rpcError } = await supabaseAdmin.rpc('rpc_cancel_order', {
      p_order_id: order.id
    })

    if (rpcError) throw new Error(`Cancel order failed: ${rpcError.message}`)
  }

  /**
   * Retur diminta → buat return record, PENDING_INSPECTION.
   * Stok BELUM kembali — harus tunggu gudang inspect kondisi barang.
   */
  private static async handleReturnRequested(payload: SimReturnRequestedPayload): Promise<void> {
    // Cari order
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('id, marketplace')
      .eq('external_order_id', payload.external_order_id)
      .single()

    const today = new Date()

    for (const item of payload.items) {
      // TikTok: hitung 40-hari deadline klaim
      let tiktokClaimDeadline: string | null = null
      if (payload.marketplace === 'TIKTOK') {
        const deadline = new Date(today)
        deadline.setDate(deadline.getDate() + 40)
        tiktokClaimDeadline = deadline.toISOString().split('T')[0]
      }

      await supabaseAdmin.from('returns').insert({
        order_id: order ? (order as { id: string }).id : null,
        marketplace: payload.marketplace,
        external_return_id: payload.external_return_id,
        product_id: item.product_id,
        qty: item.qty,
        status: 'PENDING_INSPECTION',
        tiktok_claim_deadline: tiktokClaimDeadline,
        claim_submitted: false,
      })
    }
  }
}

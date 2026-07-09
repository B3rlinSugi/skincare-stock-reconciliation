// src/lib/engine/fefo-allocator.ts
// FEFO (First Expired, First Out) — Alokasi batch otomatis
// Operator tidak pernah memilih batch. Sistem yang mengalokasikan.

import { supabaseAdmin } from '@/lib/db/client'
import type { BatchAllocation } from '@/lib/types'

export class FEFOAllocator {
  /**
   * Alokasi qty ke batch dengan FEFO (expiry terdekat dulu).
   * Return: array alokasi per batch (bisa multi-batch jika satu batch tidak cukup)
   *
   * Throws jika stok total tidak cukup.
   */
  static async allocate(productId: string, qty: number): Promise<BatchAllocation[]> {
    // Ambil semua batch aktif, sorted by expiry_date ASC (FEFO)
    const { data: batches, error } = await supabaseAdmin
      .from('v_current_stock')
      .select('batch_id, batch_code, expiry_date, current_qty')
      .eq('product_id', productId)
      .gt('current_qty', 0)        // hanya batch yang masih ada stok
      .order('expiry_date', { ascending: true })

    if (error) throw new Error(`FEFO allocate failed: ${error.message}`)

    const availableBatches = batches as {
      batch_id: string
      batch_code: string
      expiry_date: string
      current_qty: number
    }[]

    // Validasi stok total cukup
    const totalAvailable = availableBatches.reduce((sum, b) => sum + b.current_qty, 0)
    if (totalAvailable < qty) {
      throw new Error(
        `Insufficient total stock for product ${productId}. ` +
        `Available: ${totalAvailable}, Required: ${qty}`
      )
    }

    // Alokasi FEFO
    const allocations: BatchAllocation[] = []
    let remaining = qty

    for (const batch of availableBatches) {
      if (remaining <= 0) break

      const allocQty = Math.min(remaining, batch.current_qty)
      allocations.push({
        batch_id: batch.batch_id,
        batch_code: batch.batch_code,
        expiry_date: batch.expiry_date,
        qty: allocQty,
      })
      remaining -= allocQty
    }

    return allocations
  }

  /**
   * Cek apakah stok cukup tanpa melakukan alokasi
   */
  static async canFulfill(productId: string, qty: number): Promise<boolean> {
    const { data, error } = await supabaseAdmin
      .from('v_product_stock_total')
      .select('total_qty')
      .eq('product_id', productId)
      .single()

    if (error) return false
    return (data as { total_qty: number }).total_qty >= qty
  }

  /**
   * Resolve bundle SKU → daftar produk satuan via bundle_recipes.
   * Dipanggil saat order masuk dan ada item bundle.
   */
  static async resolveBundle(
    bundleSku: string,
    bundleQty: number
  ): Promise<{ product_id: string; qty: number }[]> {
    const { data: recipes, error } = await supabaseAdmin
      .from('bundle_recipes')
      .select('product_id, qty')
      .eq('bundle_sku', bundleSku)
      .eq('is_active', true)

    if (error) throw new Error(`Bundle resolve failed: ${error.message}`)
    if (!recipes || recipes.length === 0) {
      throw new Error(`No active bundle recipe found for SKU: ${bundleSku}`)
    }

    return (recipes as { product_id: string; qty: number }[]).map(r => ({
      product_id: r.product_id,
      qty: r.qty * bundleQty,
    }))
  }

  /**
   * Hitung total stok tersedia per produk (untuk dashboard / cek cepat)
   */
  static async getAvailableStock(productId: string): Promise<number> {
    const { data, error } = await supabaseAdmin
      .from('v_product_stock_total')
      .select('total_qty')
      .eq('product_id', productId)
      .single()

    if (error) return 0
    return (data as { total_qty: number }).total_qty ?? 0
  }
}

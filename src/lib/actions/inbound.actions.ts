// src/lib/actions/inbound.actions.ts
'use server'

import { supabaseAdmin } from '@/lib/db/client'
import { StockLedgerService } from '@/lib/engine/stock-ledger.service'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'

const InboundSchema = z.object({
  product_id: z.string().uuid(),
  batch_code: z.string().min(1),
  qty: z.number().int().positive(),
  expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().optional(),
})

export async function createInbound(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Unauthorized')
  }

  const raw = {
    product_id: formData.get('product_id') as string,
    batch_code: formData.get('batch_code') as string,
    qty: parseInt(formData.get('qty') as string),
    expiry_date: formData.get('expiry_date') as string,
    notes: formData.get('notes') as string | undefined,
  }

  const parsed = InboundSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors }
  }

  const { product_id, batch_code, qty, expiry_date, notes } = parsed.data

  // 1. Buat atau cari batch yang sudah ada
  let batchId: string

  const { data: existingBatch } = await supabaseAdmin
    .from('batches')
    .select('id')
    .eq('product_id', product_id)
    .eq('batch_code', batch_code)
    .single()

  if (existingBatch) {
    batchId = (existingBatch as { id: string }).id
  } else {
    const { data: newBatch, error: batchError } = await supabaseAdmin
      .from('batches')
      .insert({ product_id, batch_code, qty_received: qty, expiry_date })
      .select()
      .single()

    if (batchError || !newBatch) {
      return { success: false, error: { _: ['Gagal membuat batch baru'] } }
    }
    batchId = (newBatch as { id: string }).id
  }

  // 2. Append ledger entry
  try {
    await StockLedgerService.appendEntry({
      product_id,
      batch_id: batchId,
      movement_type: 'INBOUND',
      channel: 'MAKLON',
      quantity: qty,
      reference_type: 'INBOUND',
      notes: notes ?? `Barang masuk batch ${batch_code}`,
      created_by: user.id,
    })
  } catch (err) {
    return { success: false, error: { _: [(err as Error).message] } }
  }

  revalidatePath('/products')
  revalidatePath('/inbound')
  return { success: true }
}

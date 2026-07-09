// src/lib/actions/outbound.actions.ts
'use server'

import { StockLedgerService } from '@/lib/engine/stock-ledger.service'
import { FEFOAllocator } from '@/lib/engine/fefo-allocator'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/lib/db/client'
import type { MovementChannel } from '@/lib/types'

const ManualOutboundSchema = z.object({
  product_id: z.string().uuid(),
  qty: z.number().int().positive(),
  channel: z.enum(['OFFLINE', 'BONUS', 'PROMO', 'SAMPLE', 'DAMAGED', 'EXPIRED']),
  notes: z.string().optional(),
})

export async function createManualOutbound(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Unauthorized')
  }

  const raw = {
    product_id: formData.get('product_id') as string,
    qty: parseInt(formData.get('qty') as string),
    channel: formData.get('channel') as MovementChannel,
    notes: formData.get('notes') as string | undefined,
  }

  const parsed = ManualOutboundSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors }
  }

  const { product_id, qty, channel, notes } = parsed.data

  // FEFO allocation — secara ATOMIC di database via RPC
  const { data: allocations, error: rpcError } = await supabaseAdmin.rpc('rpc_allocate_and_deduct_fefo', {
    p_product_id: product_id,
    p_qty: qty,
    p_channel: channel,
    p_reference_type: 'MANUAL_OUT',
    p_reference_id: null,
    p_notes: notes ?? `Keluar manual: ${channel}`,
    p_created_by: user.id
  })

  if (rpcError) {
    return { success: false, error: { _: [rpcError.message] } }
  }

  revalidatePath('/products')
  revalidatePath('/outbound')
  return { success: true, allocations: allocations as unknown as { batch_code: string; batch_id: string; deducted_qty: number }[] }
}

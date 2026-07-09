// src/lib/actions/opname.actions.ts
'use server'

import { supabaseAdmin } from '@/lib/db/client'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'

/**
 * Mulai sesi stok opname baru.
 * Snapshot stok dari ledger disimpan sebagai 'system_qty'.
 */
export async function startOpname(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const title = formData.get('title') as string
  if (!title) return

  // Buat sesi opname
  const { data: opname, error: opnameError } = await supabaseAdmin
    .from('stock_opname')
    .insert({ title, status: 'COUNTING', started_by: 'warehouse' })
    .select()
    .single()

  if (opnameError || !opname) return

  const opnameId = (opname as { id: string }).id

  // Snapshot stok saat ini per produk per batch
  const { data: currentStocks } = await supabaseAdmin
    .from('v_current_stock')
    .select('product_id, batch_id, current_qty')
    .gt('current_qty', 0)

  if (currentStocks && currentStocks.length > 0) {
    const items = (currentStocks as {
      product_id: string; batch_id: string; current_qty: number
    }[]).map(s => ({
      opname_id: opnameId,
      product_id: s.product_id,
      batch_id: s.batch_id,
      system_qty: s.current_qty,
      physical_qty: null,
    }))

    await supabaseAdmin.from('stock_opname_items').insert(items)
  }

  revalidatePath('/opname')
  redirect(`/opname/${opnameId}`)
}

const InputPhysicalSchema = z.object({
  opname_id: z.string().uuid(),
  opname_item_id: z.string().uuid(),
  physical_qty: z.number().int().min(0),
  notes: z.string().optional(),
})

/**
 * Operator input hasil hitung fisik per item
 */
export async function inputPhysicalCount(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: { _: ['Unauthorized'] } }

  const raw = {
    opname_id: formData.get('opname_id') as string,
    opname_item_id: formData.get('opname_item_id') as string,
    physical_qty: parseInt(formData.get('physical_qty') as string),
    notes: formData.get('notes') as string | undefined,
  }

  const parsed = InputPhysicalSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors }
  }

  const { opname_item_id, physical_qty, notes } = parsed.data

  const { error } = await supabaseAdmin
    .from('stock_opname_items')
    .update({ physical_qty, notes: notes ?? null })
    .eq('id', opname_item_id)

  if (error) return { success: false, error: { _: [error.message] } }

  revalidatePath('/opname')
  return { success: true }
}

/**
 * Auto-save action for background debounced saving.
 * Doesn't trigger revalidatePath so the UI doesn't refresh losing focus.
 */
export async function saveOpnameItemPhysicalQty(opnameItemId: string, physicalQty: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { error } = await supabaseAdmin
    .from('stock_opname_items')
    .update({ physical_qty: physicalQty })
    .eq('id', opnameItemId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

/**
 * Selesaikan opname dan buat adjustment ledger entries untuk semua selisih.
 * Menggunakan "Dynamic Delta Strategy" secara ATOMIC di database.
 */
export async function completeOpname(opnameId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { error: rpcError } = await supabaseAdmin.rpc('rpc_complete_opname', {
    p_opname_id: opnameId,
    p_created_by: user.id
  })

  if (rpcError) {
    return { success: false, error: rpcError.message }
  }

  revalidatePath('/opname')
  revalidatePath('/products')
  return { success: true }
}

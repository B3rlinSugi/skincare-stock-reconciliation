// src/lib/actions/return.actions.ts
'use server'

import { supabaseAdmin } from '@/lib/db/client'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'
import type { ReturnCondition } from '@/lib/types'

const InspectReturnSchema = z.object({
  return_id: z.string().uuid(),
  condition: z.enum(['RESELLABLE', 'DAMAGED', 'LOST']),
  batch_id: z.string().uuid().optional(), // diperlukan jika RESELLABLE
  notes: z.string().optional(),
})

/**
 * Gudang menginspeksi retur dan menentukan kondisinya.
 * INILAH yang mengubah stok — bukan saat return request masuk.
 * Kini ditangani 100% oleh ACID RPC.
 */
export async function inspectReturn(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: { _: ['Unauthorized'] } }

  const raw = {
    return_id: formData.get('return_id') as string,
    condition: formData.get('condition') as ReturnCondition,
    batch_id: formData.get('batch_id') as string | undefined,
    notes: formData.get('notes') as string | undefined,
  }

  const parsed = InspectReturnSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors }
  }

  const { return_id, condition, batch_id, notes } = parsed.data

  // Gunakan RPC untuk keamanan ACID
  const { error: rpcError } = await supabaseAdmin.rpc('rpc_inspect_return', {
    p_return_id: return_id,
    p_condition: condition,
    p_batch_id: batch_id || null,
    p_notes: notes || null,
    p_created_by: user.id
  })

  if (rpcError) {
    return { success: false, error: { _: [rpcError.message] } }
  }

  revalidatePath('/returns')
  revalidatePath('/products')
  return { success: true, condition }
}

const SubmitClaimSchema = z.object({
  return_id: z.string().uuid(),
})

/**
 * Submit klaim TikTok — tandai sebagai claimed
 */
export async function submitTikTokClaim(formData: FormData | string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  // Support both FormData (from forms) and string (from direct call)
  const return_id = typeof formData === 'string' ? formData : formData.get('return_id')
  
  const parsed = SubmitClaimSchema.safeParse({ return_id })
  if (!parsed.success) {
    return { success: false, error: 'Invalid return ID' }
  }

  const { error } = await supabaseAdmin
    .from('returns')
    .update({ claim_submitted: true, updated_at: new Date().toISOString() })
    .eq('id', parsed.data.return_id)
    .eq('marketplace', 'TIKTOK')

  if (error) return { success: false, error: error.message }

  revalidatePath('/returns')
  return { success: true }
}

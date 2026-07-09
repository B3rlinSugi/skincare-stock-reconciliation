'use server'

import { supabaseAdmin } from '@/lib/db/client'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export async function voidLedgerEntry(ledgerId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  const { error } = await supabaseAdmin.rpc('rpc_void_ledger_entry', {
    p_ledger_id: ledgerId,
    p_created_by: user.id
  })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/products')
  revalidatePath('/products/[id]', 'page')
  return { success: true }
}

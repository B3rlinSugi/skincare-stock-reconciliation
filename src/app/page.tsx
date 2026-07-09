// src/app/page.tsx — Dashboard
import { Suspense } from 'react'
import { supabaseAdmin } from '@/lib/db/client'
import DashboardClient from '@/components/DashboardClient'
import { DashboardSkeleton } from '@/components/DashboardSkeleton'

// Pindahkan fetching data ke komponen asinkron ini agar bisa dibungkus Suspense
async function DashboardDataLoader() {
  // Simulasi artificial delay untuk melihat skeleton (bisa dihapus nanti, atau dibiarkan untuk testing)
  // await new Promise(resolve => setTimeout(resolve, 800))

  const [
    productsResult,
    returnsResult,
    anomaliesResult,
    recentLedgerResult,
    tiktokDeadlineResult,
  ] = await Promise.allSettled([
    supabaseAdmin.from('v_product_stock_total').select('product_id, total_qty'),
    supabaseAdmin.from('returns').select('id, status, marketplace, tiktok_claim_deadline, claim_submitted').eq('status', 'PENDING_INSPECTION'),
    supabaseAdmin.from('daily_reconciliation_log').select('*').eq('run_date', new Date().toISOString().split('T')[0]).eq('has_anomaly', true).limit(10),
    supabaseAdmin.from('stock_ledger').select('*, products(name)').order('created_at', { ascending: false }).limit(8),
    supabaseAdmin.from('returns').select('id, products(name), tiktok_claim_deadline, qty').eq('marketplace', 'TIKTOK').eq('claim_submitted', false).eq('status', 'INSPECTED').lte('tiktok_claim_deadline', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
  ])

  const products = productsResult.status === 'fulfilled' ? productsResult.value.data ?? [] : []
  const pendingReturns = returnsResult.status === 'fulfilled' ? returnsResult.value.data ?? [] : []
  const recentLedger = recentLedgerResult.status === 'fulfilled' ? recentLedgerResult.value.data ?? [] : []
  const tiktokUrgent = tiktokDeadlineResult.status === 'fulfilled' ? tiktokDeadlineResult.value.data ?? [] : []

  const totalProducts = (products as { product_id: string; total_qty: number }[]).length
  const zeroStock = (products as { product_id: string; total_qty: number }[]).filter(p => p.total_qty <= 0).length
  const lowStock = (products as { product_id: string; total_qty: number }[]).filter(p => p.total_qty > 0 && p.total_qty < 100).length

  const data = { totalProducts, zeroStock, lowStock, pendingReturns, recentLedger, tiktokUrgent }
  
  return <DashboardClient data={data} />
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardDataLoader />
    </Suspense>
  )
}

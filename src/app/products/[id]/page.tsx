// src/app/products/[id]/page.tsx — Detail Produk + Drill-down Ledger
import { supabaseAdmin } from '@/lib/db/client'
import { StockLedgerService } from '@/lib/engine/stock-ledger.service'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import CancelLedgerButton from '@/components/CancelLedgerButton'

const channelLabel: Record<string, string> = {
  MAKLON: 'Masuk Maklon', SHOPEE: 'Shopee', TIKTOK: 'TikTok', OFFLINE: 'Offline',
  BONUS: 'Bonus', PROMO: 'Promo', SAMPLE: 'Sampel', DAMAGED: 'Rusak', EXPIRED: 'Kedaluwarsa',
}

export default async function ProductDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const { id } = params

  const [productResult, batchesResult, ledgerEntries] = await Promise.all([
    supabaseAdmin.from('products').select('*').eq('id', id).single(),
    supabaseAdmin.from('v_current_stock').select('*').eq('product_id', id).order('expiry_date', { ascending: true }),
    StockLedgerService.getMovements(id, { limit: 50 }),
  ])

  if (productResult.error || !productResult.data) notFound()

  const product = productResult.data as { id: string; sku: string; name: string; unit: string }
  const batches = (batchesResult.data ?? []) as {
    batch_id: string; batch_code: string; expiry_date: string; current_qty: number
  }[]

  const totalStock = batches.reduce((sum, b) => sum + b.current_qty, 0)
  const today = new Date()
  const soon90 = new Date(); soon90.setDate(today.getDate() + 90)

  return (
    <>
      <div className="page-header">
        <div>
          <Link href="/products" className="text-muted text-sm" style={{ textDecoration: 'none' }}>← Kembali ke Produk</Link>
          <h1 className="page-title mt-1">{product.name}</h1>
          <p className="page-subtitle font-mono">{product.sku}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 32, fontWeight: 800 }}>{totalStock.toLocaleString('id-ID')}</div>
          <div className="text-muted text-sm">total unit tersedia</div>
        </div>
      </div>

      <div className="page-body">
        {/* Batches */}
        <div className="card mb-6">
          <div style={{ fontWeight: 600, marginBottom: 16 }}>Batch Aktif (FEFO Order)</div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Batch Code</th>
                  <th>Kedaluwarsa</th>
                  <th>Sisa Stok</th>
                  <th>Status</th>
                  <th>Prioritas FEFO</th>
                </tr>
              </thead>
              <tbody>
                {batches.filter(b => b.current_qty > 0).map((batch, idx) => {
                  const expDate = new Date(batch.expiry_date)
                  const isExpired = expDate <= today
                  const isSoon = expDate > today && expDate <= soon90
                  return (
                    <tr key={batch.batch_id}>
                      <td className="font-mono font-semibold">{batch.batch_code}</td>
                      <td className={isExpired ? 'text-danger font-semibold' : isSoon ? 'text-warning' : ''}>
                        {isExpired && '⚠️ '}{new Date(batch.expiry_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </td>
                      <td className="font-bold">{batch.current_qty.toLocaleString('id-ID')}</td>
                      <td>
                        {isExpired ? <span className="badge badge-danger">Kedaluwarsa</span>
                          : isSoon ? <span className="badge badge-warning">Mendekati</span>
                          : <span className="badge badge-success">Aman</span>}
                      </td>
                      <td>
                        {idx === 0 ? <span className="badge badge-info">🔄 Keluar Pertama</span>
                          : <span className="text-muted text-sm">#{idx + 1}</span>}
                      </td>
                    </tr>
                  )
                })}
                {batches.filter(b => b.current_qty > 0).length === 0 && (
                  <tr><td colSpan={5}><div className="empty-state"><div className="empty-state-title">Tidak ada batch aktif</div></div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Ledger History */}
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 16 }}>Riwayat Pergerakan Stok (50 Terbaru)</div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Tipe</th>
                  <th>Kanal</th>
                  <th>Qty</th>
                  <th>Ref</th>
                  <th>Catatan</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {ledgerEntries.length === 0 ? (
                  <tr><td colSpan={6}><div className="empty-state"><div className="empty-state-title">Belum ada pergerakan</div></div></td></tr>
                ) : ledgerEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="text-muted text-sm">
                      {new Date(entry.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td>
                      <span className={`badge ${entry.movement_type === 'INBOUND' ? 'badge-success' : entry.movement_type === 'OUTBOUND' ? 'badge-danger' : entry.movement_type === 'RETURN_IN' ? 'badge-info' : 'badge-warning'}`}>
                        {entry.movement_type}
                      </span>
                    </td>
                    <td><span className="badge badge-neutral">{channelLabel[entry.channel] ?? entry.channel}</span></td>
                    <td>
                      <span className={`font-bold ${entry.quantity > 0 ? 'text-success' : 'text-danger'}`}>
                        {entry.quantity > 0 ? '+' : ''}{entry.quantity.toLocaleString('id-ID')}
                      </span>
                    </td>
                    <td className="text-muted text-xs font-mono">{entry.reference_type ?? '—'}</td>
                    <td className="text-muted text-sm" style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={entry.notes ?? ''}>
                      {entry.notes ?? '—'}
                    </td>
                    <td>
                      {/* Hanya INBOUND atau MANUAL_OUT yang bisa di-void manual di layar ini */}
                      {((entry.reference_type === 'INBOUND' && entry.movement_type === 'INBOUND') || entry.reference_type === 'MANUAL_OUT') && (
                        <CancelLedgerButton ledgerId={entry.id} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}

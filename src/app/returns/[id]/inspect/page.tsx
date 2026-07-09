// src/app/returns/[id]/inspect/page.tsx — Halaman Inspeksi Retur
import { supabaseAdmin } from '@/lib/db/client'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ReturnInspectForm from '@/components/ReturnInspectForm'

export default async function ReturnInspectPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const { id } = params

  const { data: ret, error } = await supabaseAdmin
    .from('returns')
    .select('*, products(name, sku), orders(external_order_id, customer_name)')
    .eq('id', id)
    .single()

  if (error || !ret) notFound()

  // Kalau sudah diinspeksi, jangan biarkan diinspeksi lagi (readonly)
  const isPending = ret.status === 'PENDING_INSPECTION'

  // Ambil semua batch aktif untuk produk ini
  const { data: batchesData } = await supabaseAdmin
    .from('batches')
    .select('id, batch_code, expiry_date')
    .eq('product_id', ret.product_id)
    .eq('is_active', true)
    .order('expiry_date', { ascending: true })
    
  const productBatches = batchesData || []

  return (
    <>
      <div className="page-header">
        <div>
          <Link href="/returns" className="text-secondary text-sm mb-2 inline-block">← Kembali ke Daftar Retur</Link>
          <h1 className="page-title">Inspeksi Retur</h1>
          <p className="page-subtitle">Tentukan kondisi barang retur untuk pencatatan ledger</p>
        </div>
      </div>

      <div className="page-body">
        <div className="grid-cols-2" style={{ gap: 24, alignItems: 'start' }}>
          {/* Detail Informasi */}
          <div className="card">
            <div style={{ fontWeight: 600, marginBottom: 16 }}>Detail Retur</div>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px 16px', fontSize: 14 }}>
              <div className="text-muted">ID Retur</div>
              <div className="font-mono">{ret.external_return_id ?? ret.id}</div>
              
              <div className="text-muted">Marketplace</div>
              <div>{ret.marketplace}</div>
              
              <div className="text-muted">Order ID</div>
              <div className="font-mono">{ret.orders?.external_order_id ?? '—'}</div>
              
              <div className="text-muted">Produk</div>
              <div className="font-semibold">{ret.products?.name} <span className="text-muted font-mono ml-2">({ret.products?.sku})</span></div>
              
              <div className="text-muted">Jumlah</div>
              <div className="font-bold">{ret.qty} unit</div>
              
              <div className="text-muted">Status</div>
              <div>
                <span className={`badge ${isPending ? 'badge-warning' : 'badge-success'}`}>
                  {isPending ? 'Menunggu Inspeksi' : 'Sudah Diinspeksi'}
                </span>
              </div>
            </div>
          </div>

          {/* Form Inspeksi */}
          {isPending ? (
            <ReturnInspectForm returnId={id} batches={productBatches} />
          ) : (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">✅</div>
                <div className="empty-state-title">Barang Telah Diinspeksi</div>
                <div className="text-sm text-muted mt-2">
                  Kondisi: <strong>{ret.condition}</strong> <br/>
                  Tanggal: {ret.inspected_at ? new Date(ret.inspected_at).toLocaleString('id-ID') : '—'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

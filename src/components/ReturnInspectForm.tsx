'use client'

import { useState } from 'react'
import { inspectReturn } from '@/lib/actions/return.actions'

export default function ReturnInspectForm({
  returnId,
  batches
}: {
  returnId: string
  batches: { id: string; batch_code: string; expiry_date: string }[]
}) {
  const [condition, setCondition] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const formData = new FormData(e.currentTarget)
    const res = await inspectReturn(formData)
    
    if (!res.success) {
      if (res.error && typeof res.error === 'object' && '_' in res.error) {
        setError((res.error as { _: string[] })._.join(', '))
      } else {
        setError('Terjadi kesalahan')
      }
      setLoading(false)
    }
    // Jika sukses, revalidatePath di server action akan me-refresh halaman ini jadi readonly
  }

  return (
    <div className="card">
      <div style={{ fontWeight: 600, marginBottom: 16 }}>Form Inspeksi Kondisi</div>
      
      {error && (
        <div className="alert-banner alert-high" style={{ marginBottom: 16 }}>
          <span>❌</span>
          <span className="text-sm">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <input type="hidden" name="return_id" value={returnId} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          <label style={{ display: 'flex', gap: 12, padding: 16, border: `1px solid ${condition === 'RESELLABLE' ? 'var(--accent-success)' : 'var(--border-default)'}`, borderRadius: 8, cursor: 'pointer', background: condition === 'RESELLABLE' ? 'var(--accent-success-glow)' : 'transparent' }}>
            <input type="radio" name="condition" value="RESELLABLE" onChange={(e) => setCondition(e.target.value)} required />
            <div className="flex-1">
              <div className="font-semibold text-success">✅ Layak Jual (Resellable)</div>
              <div className="text-xs text-muted mt-1">Barang masih bagus. Stok akan dikembalikan ke gudang.</div>
              
              {condition === 'RESELLABLE' && (
                <div className="mt-4 pt-4 border-t border-success/20">
                  <label className="form-label text-sm font-semibold">Pilih Batch Pengembalian *</label>
                  <select name="batch_id" className="form-input text-sm w-full" required defaultValue="">
                    <option value="" disabled>-- Pilih Batch Tujuan --</option>
                    {batches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.batch_code} (Exp: {b.expiry_date})
                      </option>
                    ))}
                  </select>
                  {batches.length === 0 && (
                    <div className="text-xs text-danger mt-1">Tidak ada batch aktif untuk produk ini!</div>
                  )}
                </div>
              )}
            </div>
          </label>

          <label style={{ display: 'flex', gap: 12, padding: 16, border: `1px solid ${condition === 'DAMAGED' ? 'var(--accent-danger)' : 'var(--border-default)'}`, borderRadius: 8, cursor: 'pointer', background: condition === 'DAMAGED' ? 'rgba(239,68,68,0.05)' : 'transparent' }}>
            <input type="radio" name="condition" value="DAMAGED" onChange={(e) => setCondition(e.target.value)} required />
            <div>
              <div className="font-semibold text-danger">💔 Rusak (Damaged)</div>
              <div className="text-xs text-muted mt-1">Barang rusak, bocor, atau hancur. Stok TIDAK dikembalikan ke gudang.</div>
            </div>
          </label>

          <label style={{ display: 'flex', gap: 12, padding: 16, border: `1px solid ${condition === 'LOST' ? 'var(--accent-warning)' : 'var(--border-default)'}`, borderRadius: 8, cursor: 'pointer', background: condition === 'LOST' ? 'rgba(245,158,11,0.05)' : 'transparent' }}>
            <input type="radio" name="condition" value="LOST" onChange={(e) => setCondition(e.target.value)} required />
            <div>
              <div className="font-semibold text-warning">❓ Hilang / Paket Kosong (Lost)</div>
              <div className="text-xs text-muted mt-1">Isi paket kosong atau barang hilang di jalan. Stok TIDAK dikembalikan ke gudang.</div>
            </div>
          </label>

          <div className="form-group mt-2">
            <label className="form-label">Catatan Tambahan</label>
            <textarea name="notes" className="form-textarea" placeholder="Opsional: Keterangan kondisi..." />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading || (condition === 'RESELLABLE' && batches.length === 0)}>
            {loading ? 'Menyimpan...' : 'Simpan Hasil Inspeksi'}
          </button>
        </div>
      </form>
    </div>
  )
}

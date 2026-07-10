'use client'

import { useState, useRef } from 'react'
import { createManualOutbound } from '@/lib/actions/outbound.actions'
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner'
import { CustomSelect } from '@/components/CustomSelect'

const CHANNELS = [
  { value: 'OFFLINE', label: '🏪 Penjualan Offline', desc: 'Penjualan langsung, bukan via marketplace' },
  { value: 'BONUS', label: '🎁 Bonus', desc: 'Bonus yang diberikan ke customer' },
  { value: 'PROMO', label: '📣 Promo / Giveaway', desc: 'Barang untuk keperluan promosi' },
  { value: 'SAMPLE', label: '🧪 Sampel', desc: 'Sampel untuk testing atau review' },
  { value: 'DAMAGED', label: '💔 Barang Rusak', desc: 'Barang rusak yang dibuang' },
  { value: 'EXPIRED', label: '⚠️ Kedaluwarsa', desc: 'Barang expired yang dibuang' },
]

interface Product {
  id: string
  sku: string
  name: string
}

export default function OutboundForm({ products }: { products: Product[] }) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [allocations, setAllocations] = useState<{ batch_code: string; deducted_qty: number }[]>([])
  const [selectedChannel, setSelectedChannel] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  
  const [selectedProductId, setSelectedProductId] = useState('')
  const [scannerMode, setScannerMode] = useState(false)
  const qtyInputRef = useRef<HTMLInputElement>(null)

  useBarcodeScanner((barcode) => {
    if (!scannerMode) return
    const product = products.find(p => p.sku === barcode)
    if (product) {
      setSelectedProductId(product.id)
      setTimeout(() => qtyInputRef.current?.focus(), 100)
    }
  })

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setSuccess(false)
    setError(null)
    setFieldErrors({})
    setAllocations([])

    const formData = new FormData(e.currentTarget)
    
    const qtyStr = formData.get('qty') as string
    const qty = parseInt(qtyStr, 10)
    if (isNaN(qty) || qty <= 0) {
      setFieldErrors({ qty: ['Kuantitas harus lebih dari 0'] })
      setLoading(false)
      return
    }

    const result = await createManualOutbound(formData)

    if (result.success) {
      setSuccess(true)
      if (result.allocations) setAllocations(result.allocations)
      setSelectedChannel('')
      ;(e.target as HTMLFormElement).reset()
    } else {
      if (result.error && typeof result.error === 'object' && '_' in result.error) {
        setError(result.error._?.join(', ') || 'Terjadi kesalahan sistem')
      } else if (result.error) {
        setFieldErrors(result.error as Record<string, string[]>)
      }
    }
    setLoading(false)
  }

  const getErrorMsg = (field: string) => {
    if (fieldErrors[field] && fieldErrors[field].length > 0) {
      return <div className="text-xs text-danger mt-1">{fieldErrors[field][0]}</div>
    }
    return null
  }

  return (
    <div className="grid-cols-2" style={{ gap: 24, alignItems: 'start' }}>
      {/* Form */}
      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 20 }}>Form Keluar Manual</div>

        {success && (
          <div className="alert-banner" style={{ background: 'var(--accent-success-glow)', border: '1px solid rgba(16,185,129,0.3)', marginBottom: 16 }}>
            <div className="flex items-start gap-2">
              <span>✅</span>
              <div className="text-sm">
                <div className="font-semibold mb-1">Pengeluaran berhasil dicatat</div>
                <div className="text-muted mb-2">Sistem telah memotong stok dari batch berikut berdasarkan aturan FEFO:</div>
                <ul className="list-disc pl-4 space-y-1">
                  {allocations.map((a, i) => (
                    <li key={i}>
                      Batch <span className="font-mono font-medium">{a.batch_code}</span>: <span className="font-bold">{a.deducted_qty}</span> unit
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="alert-banner alert-high" style={{ marginBottom: 16 }}>
            <span>❌</span>
            <span className="text-sm">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Tipe Pengeluaran *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {CHANNELS.map(ch => (
                  <label key={ch.value} style={{
                    display: 'block', cursor: 'pointer',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: `1px solid ${selectedChannel === ch.value ? 'var(--accent-primary)' : fieldErrors['channel'] ? 'var(--accent-danger)' : 'var(--border-default)'}`,
                    background: selectedChannel === ch.value ? 'var(--accent-primary-glow)' : 'var(--bg-elevated)',
                    transition: 'all 0.15s',
                  }}>
                    <input
                      type="radio" name="channel" value={ch.value}
                      style={{ display: 'none' }}
                      onChange={() => setSelectedChannel(ch.value)}
                      required
                    />
                    <div style={{ fontWeight: 600, fontSize: 12 }}>{ch.label}</div>
                    <div className="text-xs text-muted">{ch.desc}</div>
                  </label>
                ))}
              </div>
              {getErrorMsg('channel')}
            </div>

            <div className="form-group flex justify-between items-end">
              <div className="flex-1">
                <label className="form-label">Produk *</label>
                <CustomSelect 
                  id="product_id"
                  name="product_id"
                  required
                  error={!!fieldErrors['product_id']}
                  value={selectedProductId}
                  onChange={(val) => setSelectedProductId(val)}
                  options={products.map(p => ({ value: p.id, label: `[${p.sku}] ${p.name}` }))}
                  placeholder="-- Pilih Produk --"
                />
                {getErrorMsg('product_id')}
              </div>
              <button 
                type="button"
                onClick={() => setScannerMode(!scannerMode)}
                className={`ml-2 btn ${scannerMode ? 'btn-primary' : 'btn-secondary'} px-3`}
                title="Scanner Mode"
              >
                Scan Barcode
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">Jumlah (Unit) *</label>
              <input ref={qtyInputRef} name="qty" type="number" min="1" className={`form-input ${fieldErrors['qty'] ? 'border-danger' : ''}`} placeholder="0" required />
              {getErrorMsg('qty') || <div className="text-xs text-muted">Batch akan dipilih otomatis dengan FEFO</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Catatan</label>
              <textarea name="notes" className={`form-textarea ${fieldErrors['notes'] ? 'border-danger' : ''}`} placeholder="Keterangan tambahan..." />
              {getErrorMsg('notes')}
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading || !selectedChannel}>
              {loading ? '⏳ Memproses...' : '✅ Catat Pengeluaran'}
            </button>
          </div>
        </form>
      </div>

      {/* Info */}
      <div>
        <div className="card mb-4" style={{ border: '1px solid rgba(245,158,11,0.2)', background: 'rgba(245,158,11,0.05)' }}>
          <div className="text-warning font-semibold text-sm mb-2">⚠️ Penting: Alasan & Kanal Terpisah</div>
          <div className="text-sm text-secondary">
            Penjualan offline dan bonus sama-sama input manual, tapi maknanya berbeda. Satu adalah penjualan, satu adalah barang gratis. Keduanya tidak boleh tercampur agar rekonsiliasi akurat.
          </div>
        </div>

        <div className="card">
          <div className="text-xs text-muted font-semibold mb-3" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            FEFO Allocation Process
          </div>
          {[
            { icon: '1️⃣', text: 'Sistem cek semua batch produk yang ada' },
            { icon: '2️⃣', text: 'Urutkan batch dari expiry paling dekat' },
            { icon: '3️⃣', text: 'Potong dari batch pertama secara ATOMIC' },
            { icon: '4️⃣', text: 'Jika satu batch habis, lanjut ke batch berikutnya' },
            { icon: '5️⃣', text: 'Mencegah double-deduction meski order masuk bersamaan' },
          ].map(step => (
            <div key={step.icon} className="flex items-center gap-3 mb-2">
              <span style={{ fontSize: 16 }}>{step.icon}</span>
              <span className="text-sm text-secondary">{step.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

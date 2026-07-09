'use client'

import { useState, useRef, useEffect } from 'react'
import { createInbound } from '@/lib/actions/inbound.actions'
import { Printer, ScanBarcode } from 'lucide-react'

interface Product {
  id: string
  sku: string
  name: string
}

export default function InboundForm({ products }: { products: Product[] }) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [lastEntry, setLastEntry] = useState<{productName: string, batchCode: string, qty: number} | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [scannerMode, setScannerMode] = useState(false)
  
  const formRef = useRef<HTMLFormElement>(null)
  const productSelectRef = useRef<HTMLSelectElement>(null)
  const batchInputRef = useRef<HTMLInputElement>(null)
  const qtyInputRef = useRef<HTMLInputElement>(null)
  const expiryInputRef = useRef<HTMLInputElement>(null)

  // Search logic for custom combobox or simple select
  // For simplicity and stability, we use a standard <select> 
  // with a datalist if there are many products, but <select> is fine for 65 items.

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setSuccess(false)
    setError(null)
    setFieldErrors({})

    const formData = new FormData(e.currentTarget)
    
    // Validasi tambahan di client-side
    const qtyStr = formData.get('qty') as string
    const qty = parseInt(qtyStr, 10)
    const expiryDateStr = formData.get('expiry_date') as string
    
    const errors: Record<string, string[]> = {}
    if (isNaN(qty) || qty <= 0) {
      errors.qty = ['Kuantitas harus lebih dari 0']
    }
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const expDate = new Date(expiryDateStr)
    if (expDate < today) {
      errors.expiry_date = ['Barang sudah kedaluwarsa! Tidak bisa diterima.']
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setLoading(false)
      return
    }

    const result = await createInbound(formData)

    if (result.success) {
      setSuccess(true)
      const productName = products.find(p => p.id === formData.get('product_id'))?.name || 'Unknown'
      setLastEntry({
        productName,
        batchCode: formData.get('batch_code') as string,
        qty
      })
      if (formRef.current) formRef.current.reset()
      
      // Auto focus back if scanner mode
      if (scannerMode && productSelectRef.current) {
        productSelectRef.current.focus()
      }
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

  // Handle enter key for scanner mode
  const handleKeyDown = (e: React.KeyboardEvent, nextRef: React.RefObject<HTMLElement | null>) => {
    if (scannerMode && e.key === 'Enter') {
      e.preventDefault()
      if (nextRef.current) {
        nextRef.current.focus()
      } else {
        // If no nextRef, it's the last field, trigger submit
        if (formRef.current) formRef.current.requestSubmit()
      }
    }
  }

  const printLabel = () => {
    window.print()
  }

  return (
    <div style={{ maxWidth: 560 }}>
      {/* Info Banner */}
      <div className="alert-banner alert-low mb-6">
        <span style={{ fontSize: 18 }}>ℹ️</span>
        <div className="text-sm">
          <strong>FEFO Otomatis</strong> — Sistem akan mengalokasikan batch dengan kedaluwarsa terdekat saat barang keluar. Kamu tidak perlu memilih batch secara manual.
        </div>
      </div>

      <div className="card print-hide">
        <div className="flex justify-between items-center mb-6">
          <div style={{ fontWeight: 600 }}>Form Penerimaan Barang</div>
          <button 
            onClick={() => setScannerMode(!scannerMode)}
            className={`btn btn-sm ${scannerMode ? 'btn-primary' : 'btn-secondary'}`}
          >
            <ScanBarcode size={14} />
            {scannerMode ? 'Scanner Mode: ON' : 'Scanner Mode: OFF'}
          </button>
        </div>

        {success && lastEntry && (
          <div className="alert-banner" style={{ background: 'var(--accent-success-glow)', border: '1px solid rgba(16,185,129,0.3)', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="flex gap-3 items-center">
              <span>✅</span>
              <div>
                <div style={{fontWeight: 500, color: 'var(--text-primary)'}}>Barang berhasil dicatat</div>
                <div className="text-sm text-secondary">{lastEntry.qty}x {lastEntry.productName} ({lastEntry.batchCode})</div>
              </div>
            </div>
            <button onClick={printLabel} className="btn btn-secondary btn-sm" style={{borderColor: 'rgba(16,185,129,0.4)', color: 'var(--accent-success)'}}>
              <Printer size={14}/> Print Label
            </button>
          </div>
        )}

        {error && (
          <div className="alert-banner alert-high" style={{ marginBottom: 16 }}>
            <span>❌</span>
            <span className="text-sm">{error}</span>
          </div>
        )}

        <form ref={formRef} onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Produk *</label>
              <select 
                ref={productSelectRef}
                name="product_id" 
                className={`form-input ${fieldErrors['product_id'] ? 'border-danger' : ''}`} 
                required 
                defaultValue=""
                onKeyDown={(e) => handleKeyDown(e, batchInputRef)}
              >
                <option value="" disabled>-- Pilih Produk --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    [{p.sku}] {p.name}
                  </option>
                ))}
              </select>
              {getErrorMsg('product_id') || <div className="text-xs text-muted">Pilih produk yang diterima dari maklon</div>}
            </div>

            <div className="grid-cols-2" style={{ gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Kode Batch *</label>
                <input 
                  ref={batchInputRef}
                  name="batch_code" 
                  className={`form-input ${fieldErrors['batch_code'] ? 'border-danger' : ''}`} 
                  placeholder="e.g. BTH-2026-001" 
                  required 
                  onKeyDown={(e) => handleKeyDown(e, qtyInputRef)}
                />
                {getErrorMsg('batch_code')}
              </div>
              <div className="form-group">
                <label className="form-label">Jumlah (Unit) *</label>
                <input 
                  ref={qtyInputRef}
                  name="qty" 
                  type="number" min="1" 
                  className={`form-input ${fieldErrors['qty'] ? 'border-danger' : ''}`} 
                  placeholder="0" 
                  required 
                  onKeyDown={(e) => handleKeyDown(e, expiryInputRef)}
                />
                {getErrorMsg('qty')}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Tanggal Kedaluwarsa *</label>
              <input 
                ref={expiryInputRef}
                name="expiry_date" 
                type="date" 
                className={`form-input ${fieldErrors['expiry_date'] ? 'border-danger' : ''}`} 
                required 
                onKeyDown={(e) => handleKeyDown(e, { current: null })} // null means submit on enter
              />
              {getErrorMsg('expiry_date')}
            </div>

            <div className="form-group">
              <label className="form-label">Catatan</label>
              <textarea name="notes" className={`form-textarea ${fieldErrors['notes'] ? 'border-danger' : ''}`} placeholder="Nomor PO, nama supplier, dll..." />
              {getErrorMsg('notes')}
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '⏳ Menyimpan...' : '✅ Catat Barang Masuk'}
            </button>
          </div>
        </form>
      </div>

      {/* Prinsip */}
      <div className="card mt-4 print-hide" style={{ background: 'var(--bg-elevated)' }}>
        <div className="text-xs text-muted font-semibold" style={{ textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
          Yang Terjadi di Backend
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            '1. Batch baru dibuat (atau yang lama diperbarui)',
            '2. Entry INBOUND ditambah ke stock_ledger',
            '3. Stok produk bertambah (dihitung dari SUM ledger)',
            '4. Batch diurutkan untuk FEFO otomatis saat keluar',
          ].map(step => (
            <div key={step} className="text-sm text-secondary">{step}</div>
          ))}
        </div>
      </div>

      {/* Print View Only */}
      {lastEntry && (
        <div className="print-only">
          <div style={{ border: '2px solid black', padding: '20px', width: '300px', margin: '0 auto', textAlign: 'center', fontFamily: 'monospace' }}>
            <h2 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>SKINCARE STOK</h2>
            <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>{lastEntry.productName}</div>
            <div style={{ margin: '20px 0' }}>
              {/* Fake Barcode visualization */}
              <div style={{ height: '50px', background: 'repeating-linear-gradient(90deg, #000, #000 2px, #fff 2px, #fff 4px, #000 4px, #000 8px, #fff 8px, #fff 10px)', width: '100%' }}></div>
            </div>
            <div style={{ fontSize: '16px', fontWeight: 'bold' }}>BATCH: {lastEntry.batchCode}</div>
            <div style={{ fontSize: '12px', marginTop: '10px' }}>QTY: {lastEntry.qty}</div>
          </div>
        </div>
      )}
    </div>
  )
}

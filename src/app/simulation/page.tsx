'use client'
// src/app/simulation/page.tsx — Tombol Simulasi Marketplace
// TANPA API REAL — ini yang memungkinkan demo sistem live

import { useState } from 'react'

interface SimResult {
  success: boolean
  message?: string
  error?: string
  event_id?: string
}

function useSimulation() {
  const [results, setResults] = useState<Record<string, SimResult | null>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  async function triggerEvent(key: string, marketplace: string, event_type: string, payload: object) {
    setLoading(l => ({ ...l, [key]: true }))
    setResults(r => ({ ...r, [key]: null }))

    try {
      const res = await fetch('/api/marketplace/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketplace, event_type, payload, source: 'SIMULATION' }),
      })
      const data = await res.json()
      setResults(r => ({ ...r, [key]: data.success ? { success: true, message: data.message, event_id: data.event_id } : { success: false, error: data.error } }))
    } catch {
      setResults(r => ({ ...r, [key]: { success: false, error: 'Network error' } }))
    }

    setLoading(l => ({ ...l, [key]: false }))
  }

  return { results, loading, triggerEvent }
}

const SAMPLE_ORDER_ID_SHOPEE = `SHP-${Date.now()}`
const SAMPLE_ORDER_ID_TIKTOK = `TKT-${Date.now()}`

export default function SimulationPage() {
  const { results, loading, triggerEvent } = useSimulation()
  const [shopeeOrderId, setShopeeOrderId] = useState(SAMPLE_ORDER_ID_SHOPEE)
  const [tiktokOrderId, setTiktokOrderId] = useState(SAMPLE_ORDER_ID_TIKTOK)
  const [productId, setProductId] = useState('')

  function SimButton({ id, label, onClick }: { id: string; label: string; onClick: () => void }) {
    const result = results[id]
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          className="btn btn-secondary"
          style={{ flex: 1, justifyContent: 'flex-start' }}
          onClick={onClick}
          disabled={loading[id]}
        >
          {loading[id] ? '⏳' : '▶'} {label}
        </button>
        {result && (
          <span className={`badge ${result.success ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: 11 }}>
            {result.success ? '✅ OK' : '❌ ' + result.error?.slice(0, 30)}
          </span>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Simulasi Marketplace</h1>
          <p className="page-subtitle">Injeksi event Shopee & TikTok untuk demo sistem — tanpa API real</p>
        </div>
      </div>

      <div className="page-body">
        {/* Info */}
        <div className="alert-banner alert-low mb-6">
          <span style={{ fontSize: 20 }}>🔧</span>
          <div>
            <div className="font-semibold text-sm">Arsitektur Simulasi</div>
            <div className="text-sm text-secondary">
              Tombol-tombol ini memanggil endpoint yang sama yang akan dipakai webhook marketplace. Saat API real tersedia, cukup ganti source dari "SIMULATION" ke "WEBHOOK" — zero logic changes.
            </div>
          </div>
        </div>

        {/* Config */}
        <div className="card mb-6">
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Konfigurasi Simulasi</div>
          <div className="grid-cols-3" style={{ gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Product ID</label>
              <input className="form-input" value={productId} onChange={e => setProductId(e.target.value)} placeholder="UUID produk untuk simulasi" />
            </div>
            <div className="form-group">
              <label className="form-label">Shopee Order ID</label>
              <input className="form-input" value={shopeeOrderId} onChange={e => setShopeeOrderId(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">TikTok Order ID</label>
              <input className="form-input" value={tiktokOrderId} onChange={e => setTiktokOrderId(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="grid-cols-2" style={{ gap: 24 }}>
          {/* Shopee */}
          <div className="card flex flex-col justify-between">
            <div className="font-semibold text-lg mb-4 flex items-center gap-2">
              <span style={{ fontSize: 20 }}>🛍️</span> Shopee Events
            </div>
            <div className="flex flex-col gap-3 mb-4">
              <SimButton
                id="shopee-create"
                label="1. Pesanan Masuk (PENDING)"
                onClick={() => triggerEvent('shopee-create', 'SHOPEE', 'ORDER_CREATED', {
                  external_order_id: shopeeOrderId,
                  marketplace: 'SHOPEE',
                  customer_name: 'Customer Demo Shopee',
                  items: productId ? [{ product_id: productId, qty: 2 }] : [],
                })}
              />
              <SimButton
                id="shopee-ship"
                label="2. Dikirim → Potong Stok (SHIPPED)"
                onClick={() => triggerEvent('shopee-ship', 'SHOPEE', 'ORDER_SHIPPED', {
                  external_order_id: shopeeOrderId,
                  marketplace: 'SHOPEE',
                  new_status: 'SHIPPED',
                })}
              />
              <SimButton
                id="shopee-cancel"
                label="3. Batalkan Pesanan (CANCELLED)"
                onClick={() => triggerEvent('shopee-cancel', 'SHOPEE', 'ORDER_CANCELLED', {
                  external_order_id: shopeeOrderId,
                  marketplace: 'SHOPEE',
                  new_status: 'CANCELLED',
                })}
              />
              <SimButton
                id="shopee-return"
                label="4. Ajukan Retur"
                onClick={() => triggerEvent('shopee-return', 'SHOPEE', 'RETURN_REQUESTED', {
                  external_order_id: shopeeOrderId,
                  marketplace: 'SHOPEE',
                  external_return_id: `RET-SHP-${Date.now()}`,
                  items: productId ? [{ product_id: productId, qty: 1 }] : [],
                })}
              />
            </div>

            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
              <div className="text-xs text-muted font-semibold mb-2">FLOW SHOPEE</div>
              <div className="text-xs text-secondary">
                PENDING → <strong className="text-warning">SHIPPED</strong> (stok dipotong FEFO) → DELIVERED<br />
                atau: PENDING → SHIPPED → <strong className="text-info">RETURN_REQUESTED</strong> → Inspect Gudang
              </div>
            </div>
          </div>

          {/* TikTok */}
          <div className="card flex flex-col justify-between">
            <div className="font-semibold text-lg mb-4 flex items-center gap-2">
              <span style={{ fontSize: 20 }}>🎵</span> TikTok Shop Events
            </div>
            <div className="flex flex-col gap-3 mb-4">
              <SimButton
                id="tiktok-create"
                label="1. Pesanan Masuk (PENDING)"
                onClick={() => triggerEvent('tiktok-create', 'TIKTOK', 'ORDER_CREATED', {
                  external_order_id: tiktokOrderId,
                  marketplace: 'TIKTOK',
                  customer_name: 'Customer Demo TikTok',
                  items: productId ? [{ product_id: productId, qty: 3 }] : [],
                })}
              />
              <SimButton
                id="tiktok-transit"
                label="2. Dalam Pengiriman → Potong Stok (IN_TRANSIT)"
                onClick={() => triggerEvent('tiktok-transit', 'TIKTOK', 'ORDER_IN_TRANSIT', {
                  external_order_id: tiktokOrderId,
                  marketplace: 'TIKTOK',
                  new_status: 'IN_TRANSIT',
                })}
              />
              <SimButton
                id="tiktok-cancel"
                label="3. Batalkan Pesanan"
                onClick={() => triggerEvent('tiktok-cancel', 'TIKTOK', 'ORDER_CANCELLED', {
                  external_order_id: tiktokOrderId,
                  marketplace: 'TIKTOK',
                  new_status: 'CANCELLED',
                })}
              />
              <SimButton
                id="tiktok-return"
                label="4. Retur (+ hitung 40 hari deadline klaim)"
                onClick={() => triggerEvent('tiktok-return', 'TIKTOK', 'RETURN_REQUESTED', {
                  external_order_id: tiktokOrderId,
                  marketplace: 'TIKTOK',
                  external_return_id: `RET-TKT-${Date.now()}`,
                  items: productId ? [{ product_id: productId, qty: 2 }] : [],
                })}
              />
            </div>

            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
              <div className="text-xs text-muted font-semibold mb-2">FLOW TIKTOK</div>
              <div className="text-xs text-secondary">
                PENDING → <strong className="text-warning">IN_TRANSIT</strong> (stok dipotong FEFO) → DELIVERED<br />
                Retur: deadline klaim <strong className="text-danger">40 hari</strong> otomatis dihitung
              </div>
            </div>
          </div>
        </div>

        {/* Technical Note */}
        <div className="card mt-6" style={{ background: 'var(--bg-elevated)' }}>
          <div className="text-xs text-muted font-semibold mb-3" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Cara Kerja Simulasi
          </div>
          <div className="grid-cols-2" style={{ gap: 16 }}>
            {[
              { icon: '1️⃣', title: 'Event di-push ke marketplace_events table', desc: 'source=SIMULATION, status=PENDING' },
              { icon: '2️⃣', title: 'MarketplaceProcessor.processEvent() dipanggil', desc: 'Kode yang sama dengan webhook asli' },
              { icon: '3️⃣', title: 'Business logic berjalan', desc: 'FEFO allocation, ledger append, status update' },
              { icon: '4️⃣', title: 'Event di-update ke PROCESSED', desc: 'Semua jejak tercatat di ledger' },
            ].map(s => (
              <div key={s.icon} className="flex gap-3">
                <span style={{ fontSize: 20, flexShrink: 0 }}>{s.icon}</span>
                <div>
                  <div className="text-sm font-semibold">{s.title}</div>
                  <div className="text-xs text-muted">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

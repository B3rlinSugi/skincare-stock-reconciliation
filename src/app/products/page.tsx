import Link from 'next/link'
import { Suspense } from 'react'
import Pagination from '@/components/Pagination'
import Search from '@/components/Search'
import ExportButton from '@/components/ExportButton'
import { StatCard } from '@/components/StatCard'
import { Package, AlertTriangle, CalendarDays, Filter, ChevronDown, ChevronRight, Download, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'

// Helper: direct fetch bypassing supabase-js client
async function sbFetch(path: string, extraHeaders: Record<string, string> = {}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const res = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, ...extraHeaders },
    cache: 'no-store',
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Supabase error ${res.status}: ${err}`)
  }
  return res
}

export default async function ProductsPage(
  props: { searchParams: Promise<{ query?: string; page?: string }> }
) {
  try {
    const searchParams = await props.searchParams
    const query = searchParams?.query || ''
    const currentPage = Number(searchParams?.page) || 1
    const limit = 20
    const offset = (currentPage - 1) * limit

    // 1. Fetch paginated products
    const searchFilter = query
      ? `&or=(name.ilike.*${encodeURIComponent(query)}*,sku.ilike.*${encodeURIComponent(query)}*)`
      : ''
    const productsRes = await sbFetch(
      `products?select=id,sku,name,is_active&order=name.asc&limit=${limit}&offset=${offset}${searchFilter}`,
      { 'Prefer': 'count=exact' }
    )
    const countHeader = productsRes.headers.get('content-range') // e.g. "0-19/70"
    const totalCount = countHeader ? parseInt(countHeader.split('/')[1] || '0') : 0
    const products: any[] = await productsRes.json()
    const totalPages = Math.ceil(totalCount / limit)

    // 2. Fetch stock totals and batches ONLY for these paginated products
    const productIds = products.map((p: any) => p.id)

    let totals: any[] = []
    let rows: any[] = []

    if (productIds.length > 0) {
      const idFilter = `product_id=in.(${productIds.join(',')})`
      const [totalsRes, batchesRes] = await Promise.all([
        sbFetch(`v_product_stock_total?${idFilter}`),
        sbFetch(`v_current_stock?${idFilter}`)
      ])
      totals = await totalsRes.json()
      rows = await batchesRes.json()
    }

    const today = new Date()
    const soon90 = new Date(); soon90.setDate(today.getDate() + 90)

    // Group batches by product
    const byProduct = new Map<string, typeof rows>()
    let expiredCount = 0
    let lowStockCount = 0

    for (const row of rows) {
      if (!byProduct.has(row.product_id)) byProduct.set(row.product_id, [])
      byProduct.get(row.product_id)!.push(row)
      
      // Calculate global metrics
      if (row.current_qty > 0) {
        if (new Date(row.expiry_date) <= today) expiredCount++
      }
    }

    // Create a map for easy total lookup
    const totalsMap = new Map(totals.map(t => {
      if (t.total_qty < 100) lowStockCount++
      return [t.product_id, t.total_qty]
    }))

    return (
      <>
        <div className="page-header" style={{ paddingBottom: 24 }}>
          <div>
            <h1 className="page-title text-2xl">Produk & Stok</h1>
            <p className="page-subtitle text-sm">Realtime Inventory</p>
          </div>
          <div className="flex gap-3">
            <ExportButton type="PRODUCTS" label="Export CSV" />
            <Link href="/inbound" className="btn btn-sm" style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-info)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
              <ArrowDownToLine size={14} /> Barang Masuk
            </Link>
            <Link href="/outbound" className="btn btn-sm" style={{ background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-primary)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
              <ArrowUpFromLine size={14} /> Keluar Manual
            </Link>
          </div>
        </div>

        <div className="page-body">
          {/* Top Metrics - Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.5fr', gap: '24px' }}>
            <div className="col-span-1">
              <StatCard 
                title="Total Produk"
                value={totalCount}
                subtitle="Semua Produk"
                icon={Package}
                colorClass="text-info"
                borderColorClass="rgba(139, 92, 246, 0.3)"
                bgAlphaClass="rgba(139, 92, 246, 0.2)"
                glowColorClass="rgba(139, 92, 246, 0.5)"
              />
            </div>

            <div className="col-span-1">
              <StatCard 
                title="Low Stock"
                value={lowStockCount}
                subtitle="Stok Menipis"
                icon={AlertTriangle}
                colorClass={lowStockCount > 0 ? "text-warning" : "text-primary"}
                borderColorClass="rgba(245, 158, 11, 0.3)"
                bgAlphaClass="rgba(245, 158, 11, 0.2)"
                glowColorClass="rgba(245, 158, 11, 0.5)"
              />
            </div>

            <div className="col-span-1">
              <StatCard 
                title="Expired"
                value={expiredCount}
                subtitle="Akan Kedaluwarsa"
                icon={CalendarDays}
                colorClass={expiredCount > 0 ? "text-danger" : "text-primary"}
                borderColorClass="rgba(236, 72, 153, 0.3)"
                bgAlphaClass="rgba(236, 72, 153, 0.2)"
                glowColorClass="rgba(236, 72, 153, 0.5)"
              />
            </div>

            {/* Inventory Health Chart - CSS Only Mockup */}
            <div className="stat-card" style={{ borderColor: 'rgba(6, 182, 212, 0.3)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
              <div className="text-primary font-medium mb-2 text-sm z-10">Inventory Health</div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', zIndex: 10 }}>
                <div style={{ 
                  width: 80, height: 80, borderRadius: '50%', 
                  border: '4px solid rgba(6, 182, 212, 0.2)', 
                  borderTopColor: 'var(--accent-success)',
                  borderRightColor: 'var(--accent-success)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 20px rgba(6, 182, 212, 0.3), inset 0 0 20px rgba(6, 182, 212, 0.2)',
                  transform: 'rotate(-45deg)'
                }}>
                  <div style={{ transform: 'rotate(45deg)', fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', textShadow: '0 0 10px var(--accent-success-glow)' }}>86%</div>
                </div>
              </div>
              {/* Fake Wave Line */}
              <svg viewBox="0 0 200 100" style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '80%', opacity: 0.6 }}>
                <path d="M0,50 Q25,80 50,50 T100,50 T150,50 T200,30 L200,100 L0,100 Z" fill="rgba(6, 182, 212, 0.1)" />
                <path d="M0,50 Q25,80 50,50 T100,50 T150,50 T200,30" fill="none" stroke="var(--accent-success)" strokeWidth="2" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 5px var(--accent-success))' }} />
              </svg>
            </div>
            
          </div>

          {/* Search & Filter Bar */}
          <div style={{ 
            background: 'var(--bg-surface)', 
            border: '1px solid var(--border-subtle)', 
            borderRadius: 16, 
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginBottom: 24,
            backdropFilter: 'blur(12px)'
          }}>
            <div style={{ flex: 1 }}>
              <Suspense fallback={<div className="text-muted">Loading...</div>}>
                <Search placeholder="Cari SKU atau Nama Produk..." />
              </Suspense>
            </div>
            
            <div style={{ width: '1px', height: '24px', background: 'var(--border-strong)' }}></div>
            
            <div className="flex gap-4 items-center">
              <div className="flex items-center gap-2 cursor-pointer text-sm font-medium hover:text-white transition-colors" style={{ color: 'var(--text-secondary)' }}>
                Status <ChevronDown size={14} />
              </div>
              <div className="flex items-center gap-2 cursor-pointer text-sm font-medium hover:text-white transition-colors" style={{ color: 'var(--text-secondary)' }}>
                Batch <ChevronDown size={14} />
              </div>
              <div className="flex items-center gap-2 cursor-pointer text-sm font-medium hover:text-white transition-colors" style={{ color: 'var(--text-secondary)' }}>
                Kategori <ChevronDown size={14} />
              </div>
              <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-strong)' }}>
                <Filter size={14} /> Filter
              </button>
            </div>
          </div>

          <div className="table-container" style={{ background: 'transparent', border: 'none' }}>
            <table>
              <thead>
                <tr style={{ background: 'var(--bg-surface)' }}>
                  <th style={{ borderRadius: '12px 0 0 12px', paddingLeft: 24 }}>SKU</th>
                  <th>NAMA PRODUK</th>
                  <th style={{ width: '22%' }}>TOTAL STOK</th>
                  <th>BATCH AKTIF</th>
                  <th>EXPIRED TERDEKAT</th>
                  <th>STATUS</th>
                  <th style={{ borderRadius: '0 12px 12px 0' }}>AKSI</th>
                </tr>
              </thead>
              <tbody style={{ borderTop: '8px solid transparent' }}>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                      Tidak ada produk ditemukan.
                    </td>
                  </tr>
                ) : products.map((product) => {
                  const totalQty = totalsMap.get(product.id) || 0
                  const batches = byProduct.get(product.id) ?? []
                  const activeBatches = batches.filter(b => b.current_qty > 0)
                  const earliestExpiry = activeBatches.sort((a, b) =>
                    a.expiry_date.localeCompare(b.expiry_date))[0]?.expiry_date

                  const expiryDate = earliestExpiry ? new Date(earliestExpiry) : null
                  const isExpired = expiryDate && expiryDate <= today
                  const isExpiringSoon = expiryDate && expiryDate > today && expiryDate <= soon90

                  const stockStatus = totalQty <= 0
                    ? { label: 'Habis', cls: 'badge-danger' }
                    : totalQty < 100
                    ? { label: 'Rendah', cls: 'badge-warning' }
                    : { label: 'Aman', cls: 'badge-success' }

                  // Calculate progress bar width (assuming 2000 is a healthy max for visual display)
                  const maxDisplayStock = 2000
                  const progressWidth = Math.min((totalQty / maxDisplayStock) * 100, 100)
                  const progressColor = totalQty < 100 ? 'var(--accent-warning)' : 'var(--accent-primary)'

                  return (
                    <tr key={product.id} style={{ background: 'var(--bg-surface)', borderBottom: '4px solid var(--bg-base)' }}>
                      <td className="font-mono text-xs" style={{ color: 'var(--text-muted)', borderTopLeftRadius: 12, borderBottomLeftRadius: 12, paddingLeft: 24 }}>{product.sku}</td>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        <div style={{ opacity: product.is_active ? 1 : 0.5 }}>{product.name}</div>
                        {!product.is_active && <div className="text-xs text-danger font-medium mt-1">Tidak Aktif</div>}
                      </td>
                      <td>
                        <div className="flex items-center gap-4">
                          <span className="font-bold text-white w-12">{totalQty.toLocaleString('id-ID')}</span>
                          <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden', minWidth: 80 }}>
                            <div style={{ height: '100%', width: `${progressWidth}%`, background: progressColor, boxShadow: `0 0 10px ${progressColor}` }} />
                          </div>
                        </div>
                      </td>
                      <td className="font-medium" style={{ color: 'var(--text-secondary)' }}>{activeBatches.length} batch</td>
                      <td>
                        {earliestExpiry ? (
                          <span className={`font-medium ${isExpired ? 'text-danger' : isExpiringSoon ? 'text-warning' : 'text-secondary'}`} style={{ textShadow: isExpired ? '0 0 10px var(--accent-danger-glow)' : 'none' }}>
                            {new Date(earliestExpiry).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        ) : <span className="text-muted">—</span>}
                      </td>
                      <td>
                        <span className={`badge ${stockStatus.cls}`} style={{ textTransform: 'capitalize', letterSpacing: 'normal' }}>
                          {stockStatus.label}
                        </span>
                      </td>
                      <td style={{ borderTopRightRadius: 12, borderBottomRightRadius: 12 }}>
                        <Link href={`/products/${product.id}`} className="btn btn-secondary btn-sm" style={{ padding: '6px 12px' }}>
                          Detail <ChevronRight size={14} className="ml-1 opacity-70" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-between items-center text-sm text-secondary">
            <div>
              Menampilkan {products.length} dari {totalCount} produk
            </div>
            <Suspense fallback={null}>
              <Pagination totalPages={totalPages} currentPage={currentPage} />
            </Suspense>
          </div>
        </div>
      </>
    )
  } catch (err: any) {
    return (
      <div style={{color:'white', padding:'2rem', fontFamily:'monospace', background:'#1a0000', minHeight:'100vh'}}>
        <h2 style={{color:'#ff6b6b'}}>🔴 Server Error — /products</h2>
        <pre style={{background:'#2a0000', padding:'1rem', borderRadius:'8px', overflow:'auto', fontSize:'13px'}}>
          {err?.message || String(err)}
          {'\n\nStack:\n'}
          {err?.stack}
        </pre>
      </div>
    )
  }
}

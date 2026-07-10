// src/app/products/page.tsx — Halaman Daftar Produk & Stok
import Link from 'next/link'
import { Suspense } from 'react'
import Pagination from '@/components/Pagination'
import Search from '@/components/Search'
import ExportButton from '@/components/ExportButton'

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
  for (const row of rows) {
    if (!byProduct.has(row.product_id)) byProduct.set(row.product_id, [])
    byProduct.get(row.product_id)!.push(row)
  }

  // Create a map for easy total lookup
  const totalsMap = new Map(totals.map(t => [t.product_id, t.total_qty]))

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Produk & Stok</h1>
          <p className="page-subtitle">Stok real-time dihitung dari buku besar pergerakan</p>
        </div>
        <div className="flex gap-2">
          <ExportButton type="PRODUCTS" label="Export CSV" />
          <Link href="/inbound" className="btn btn-success btn-sm">⬇️ Barang Masuk</Link>
          <Link href="/outbound" className="btn btn-secondary btn-sm">⬆️ Keluar Manual</Link>
        </div>
      </div>

      <div className="page-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Suspense fallback={<div className="form-input" style={{maxWidth:400}}>Loading...</div>}>
            <Search placeholder="Cari SKU atau Nama Produk..." />
          </Suspense>
          <div className="text-sm text-secondary">
            Menampilkan {products.length} dari {totalCount} produk
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Nama Produk</th>
                <th>Total Stok</th>
                <th>Batch Aktif</th>
                <th>Expiry Terdekat</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
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
                  ? { dot: 'empty', label: 'Habis', cls: 'badge-danger' }
                  : totalQty < 100
                  ? { dot: 'low', label: 'Rendah', cls: 'badge-warning' }
                  : { dot: 'ok', label: 'Aman', cls: 'badge-success' }

                return (
                  <tr key={product.id}>
                    <td className="font-mono text-muted text-xs">{product.sku}</td>
                    <td style={{ fontWeight: 500 }}>
                      <div style={{ opacity: product.is_active ? 1 : 0.5 }}>{product.name}</div>
                      {!product.is_active && <div className="text-xs text-danger">Tidak Aktif</div>}
                    </td>
                    <td>
                      <div className="stock-indicator">
                        <span className={`stock-dot ${stockStatus.dot}`} />
                        <span className="font-bold">{totalQty.toLocaleString('id-ID')}</span>
                      </div>
                    </td>
                    <td className="text-secondary">{activeBatches.length} batch</td>
                    <td>
                      {earliestExpiry ? (
                        <span className={isExpired ? 'text-danger font-semibold' : isExpiringSoon ? 'text-warning' : 'text-secondary'}>
                          {isExpired && '⚠️ '}{new Date(earliestExpiry).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      ) : <span className="text-muted">—</span>}
                    </td>
                    <td><span className={`badge ${stockStatus.cls}`}>{stockStatus.label}</span></td>
                    <td>
                      <Link href={`/products/${product.id}`} className="btn btn-secondary btn-sm">
                        Detail →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <Suspense fallback={null}>
          <Pagination totalPages={totalPages} currentPage={currentPage} />
        </Suspense>
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

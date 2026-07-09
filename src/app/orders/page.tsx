// src/app/orders/page.tsx — Daftar Pesanan Marketplace
import { supabaseAdmin } from '@/lib/db/client'
import Link from 'next/link'
import Pagination from '@/components/Pagination'
import Search from '@/components/Search'
import FilterSelect from '@/components/FilterSelect'

const statusConfig: Record<string, { label: string; cls: string }> = {
  PENDING:    { label: 'Pending', cls: 'badge-neutral' },
  SHIPPED:    { label: 'Dikirim', cls: 'badge-info' },
  IN_TRANSIT: { label: 'Dalam Pengiriman', cls: 'badge-info' },
  DELIVERED:  { label: 'Selesai', cls: 'badge-success' },
  CANCELLED:  { label: 'Dibatalkan', cls: 'badge-danger' },
  RETURNED:   { label: 'Diretur', cls: 'badge-warning' },
}

export default async function OrdersPage(
  props: { searchParams: Promise<{ query?: string; page?: string; marketplace?: string; status?: string }> }
) {
  const searchParams = await props.searchParams
  const query = searchParams?.query || ''
  const marketplace = searchParams?.marketplace || ''
  const statusFilter = searchParams?.status || ''
  const currentPage = Number(searchParams?.page) || 1
  const limit = 20
  const offset = (currentPage - 1) * limit

  let ordersQuery = supabaseAdmin
    .from('orders')
    .select('*, order_items(id, product_id, qty, batch_id)', { count: 'exact' })
    
  if (query) {
    ordersQuery = ordersQuery.ilike('external_order_id', `%${query}%`)
  }
  if (marketplace) {
    ordersQuery = ordersQuery.eq('marketplace', marketplace)
  }
  if (statusFilter) {
    ordersQuery = ordersQuery.eq('status', statusFilter)
  }

  const { data, count, error } = await ordersQuery
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  const orders = (data ?? []) as {
    id: string; marketplace: string; external_order_id: string;
    status: string; customer_name: string | null; stock_deducted: boolean;
    created_at: string; order_items: { id: string; qty: number }[]
  }[]

  const totalPages = Math.ceil((count || 0) / limit)

  // Overall stats (independent of pagination/filters, to show high-level view)
  const { data: allStats } = await supabaseAdmin.from('orders').select('marketplace, status, stock_deducted')
  const shopeeCount = allStats?.filter(o => o.marketplace === 'SHOPEE').length || 0
  const tiktokCount = allStats?.filter(o => o.marketplace === 'TIKTOK').length || 0
  const cancelledWithStock = allStats?.filter(o => o.status === 'CANCELLED' && o.stock_deducted).length || 0

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Pesanan Marketplace</h1>
          <p className="page-subtitle">Stok dipotong saat: Shopee SHIPPED · TikTok IN_TRANSIT</p>
        </div>
        <Link href="/simulation" className="btn btn-secondary btn-sm">🎮 Simulasi Event</Link>
      </div>

      <div className="page-body">
        {/* Stats */}
        <div className="grid-cols-4 mb-6">
          <div className="stat-card primary">
            <div className="text-muted text-sm mb-1">Total Pesanan</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{allStats?.length || 0}</div>
          </div>
          <div className="stat-card">
            <div className="text-muted text-sm mb-1">Shopee</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{shopeeCount}</div>
          </div>
          <div className="stat-card">
            <div className="text-muted text-sm mb-1">TikTok Shop</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{tiktokCount}</div>
          </div>
          {cancelledWithStock > 0 && (
            <div className="stat-card danger">
              <div className="text-muted text-sm mb-1">⚠️ Batal - Stok Belum Kembali</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent-danger)' }}>{cancelledWithStock}</div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="flex gap-2 w-full" style={{ maxWidth: 600 }}>
            <Search placeholder="Cari Order ID..." />
            <FilterSelect 
              paramName="marketplace" 
              options={[
                { value: 'SHOPEE', label: 'Shopee' },
                { value: 'TIKTOK', label: 'TikTok Shop' }
              ]} 
              placeholder="Semua Marketplace" 
            />
            <FilterSelect 
              paramName="status" 
              options={Object.entries(statusConfig).map(([k, v]) => ({ value: k, label: v.label }))} 
              placeholder="Semua Status" 
            />
          </div>
          <div className="text-sm text-secondary">
            Total {count} pesanan
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Marketplace</th>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Item Count</th>
                <th>Status</th>
                <th>Stok Dipotong?</th>
                <th>Tanggal</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      <div className="empty-state-icon">🛒</div>
                      <div className="empty-state-title">Belum ada pesanan</div>
                      <div className="text-sm text-muted mt-1">Gunakan halaman Simulasi untuk inject pesanan, atau ubah filter Anda.</div>
                    </div>
                  </td>
                </tr>
              ) : orders.map(order => (
                <tr key={order.id}>
                  <td>
                    <span className={`badge ${order.marketplace === 'SHOPEE' ? 'badge-warning' : 'badge-danger'}`}>
                      {order.marketplace === 'SHOPEE' ? '🛍️' : '🎵'} {order.marketplace}
                    </span>
                  </td>
                  <td className="font-mono text-sm">{order.external_order_id}</td>
                  <td>{order.customer_name ?? '—'}</td>
                  <td className="text-secondary">{order.order_items.length} item</td>
                  <td><span className={`badge ${statusConfig[order.status]?.cls ?? 'badge-neutral'}`}>{statusConfig[order.status]?.label ?? order.status}</span></td>
                  <td>
                    {order.stock_deducted
                      ? <span className="badge badge-success">✅ Ya</span>
                      : <span className="badge badge-neutral">Belum</span>}
                  </td>
                  <td className="text-muted text-sm">
                    {new Date(order.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination totalPages={totalPages} currentPage={currentPage} />

        {/* Timing note */}
        <div className="card mt-4" style={{ background: 'var(--bg-elevated)' }}>
          <div className="text-xs text-muted font-semibold mb-2" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Kapan Stok Dipotong?
          </div>
          <div className="grid-cols-2" style={{ gap: 12 }}>
            <div className="flex gap-3 items-center">
              <span style={{ fontSize: 20 }}>🛍️</span>
              <div>
                <div className="text-sm font-semibold">Shopee</div>
                <div className="text-xs text-muted">Stok dipotong saat status = <strong className="text-warning">SHIPPED</strong></div>
              </div>
            </div>
            <div className="flex gap-3 items-center">
              <span style={{ fontSize: 20 }}>🎵</span>
              <div>
                <div className="text-sm font-semibold">TikTok Shop</div>
                <div className="text-xs text-muted">Stok dipotong saat status = <strong className="text-warning">IN_TRANSIT</strong></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

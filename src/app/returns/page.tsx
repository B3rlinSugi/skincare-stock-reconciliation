// src/app/returns/page.tsx — Penanganan Retur
import { supabaseAdmin } from '@/lib/db/client'
import Link from 'next/link'
import Pagination from '@/components/Pagination'
import FilterSelect from '@/components/FilterSelect'
import { submitTikTokClaim } from '@/lib/actions/return.actions'

const conditionConfig: Record<string, { label: string; cls: string; desc: string }> = {
  RESELLABLE: { label: 'Layak Jual', cls: 'badge-success', desc: 'Stok dikembalikan' },
  DAMAGED:    { label: 'Rusak', cls: 'badge-danger', desc: 'Stok tidak kembali' },
  LOST:       { label: 'Hilang', cls: 'badge-neutral', desc: 'Stok tidak kembali' },
}

export default async function ReturnsPage(
  props: { searchParams: Promise<{ page?: string; status?: string; condition?: string }> }
) {
  const searchParams = await props.searchParams
  const statusFilter = searchParams?.status || ''
  const conditionFilter = searchParams?.condition || ''
  const currentPage = Number(searchParams?.page) || 1
  const limit = 20
  const offset = (currentPage - 1) * limit

  let returnsQuery = supabaseAdmin
    .from('returns')
    .select('*, products(name, sku)', { count: 'exact' })

  if (statusFilter) {
    returnsQuery = returnsQuery.eq('status', statusFilter)
  }
  if (conditionFilter) {
    returnsQuery = returnsQuery.eq('condition', conditionFilter)
  }

  const { data, count, error } = await returnsQuery
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  const returns = (data ?? []) as {
    id: string; marketplace: string; external_return_id: string | null;
    product_id: string; qty: number; condition: string | null;
    status: string; tiktok_claim_deadline: string | null;
    claim_submitted: boolean; inspected_at: string | null;
    created_at: string; products: { name: string; sku: string } | null
  }[]

  const totalPages = Math.ceil((count || 0) / limit)

  // Overall stats (independent of pagination)
  const { data: allReturns } = await supabaseAdmin.from('returns').select('status, tiktok_claim_deadline, claim_submitted')
  const pendingCount = allReturns?.filter(r => r.status === 'PENDING_INSPECTION').length || 0
  
  const today = new Date()
  const urgentCount = allReturns?.filter(r => {
    if (!r.tiktok_claim_deadline || r.claim_submitted) return false
    const deadline = new Date(r.tiktok_claim_deadline)
    const diff = (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    return diff <= 7 && r.status === 'INSPECTED'
  }).length || 0

  const urgentList = returns.filter(r => {
    if (!r.tiktok_claim_deadline || r.claim_submitted) return false
    const deadline = new Date(r.tiktok_claim_deadline)
    const diff = (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    return diff <= 7 && r.status === 'INSPECTED'
  })

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Penanganan Retur</h1>
          <p className="page-subtitle">Inspeksi kondisi retur — layak jual, rusak, atau hilang</p>
        </div>
        <div className="flex gap-2">
          {pendingCount > 0 && (
            <span className="badge badge-warning" style={{ padding: '6px 12px', fontSize: 13 }}>
              {pendingCount} pending inspeksi
            </span>
          )}
          {urgentCount > 0 && (
            <span className="badge badge-danger" style={{ padding: '6px 12px', fontSize: 13 }}>
              🚨 {urgentCount} TikTok urgent
            </span>
          )}
        </div>
      </div>

      <div className="page-body">
        {/* TikTok Urgent (Showing only from current page for simplicity, or could fetch independently) */}
        {urgentList.length > 0 && (
          <div className="mb-6">
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-danger)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
              🚨 TikTok — Klaim Segera (Batas &lt; 7 Hari)
            </div>
            {urgentList.map(ret => {
              const daysLeft = Math.ceil((new Date(ret.tiktok_claim_deadline!).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
              return (
                <div key={ret.id} className="alert-banner alert-high mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: 20 }}>⏰</span>
                    <div>
                      <div className="font-semibold">{ret.products?.name ?? 'Unknown'} — {ret.qty} unit</div>
                      <div className="text-sm text-muted">Deadline: {ret.tiktok_claim_deadline} ({daysLeft} hari lagi)</div>
                    </div>
                  </div>
                  <form action={submitTikTokClaim}>
                    <input type="hidden" name="return_id" value={ret.id} />
                    <button type="submit" className="btn btn-danger btn-sm">
                      Submit Klaim
                    </button>
                  </form>
                </div>
              )
            })}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="flex gap-2 w-full" style={{ maxWidth: 600 }}>
            <FilterSelect 
              paramName="status" 
              options={[
                { value: 'PENDING_INSPECTION', label: 'Pending Inspeksi' },
                { value: 'INSPECTED', label: 'Sudah Diinspeksi' },
                { value: 'CLAIMED', label: 'Diklaim' }
              ]} 
              placeholder="Semua Status" 
            />
            <FilterSelect 
              paramName="condition" 
              options={Object.entries(conditionConfig).map(([k, v]) => ({ value: k, label: v.label }))} 
              placeholder="Semua Kondisi" 
            />
          </div>
          <div className="text-sm text-secondary">
            Total {count} retur
          </div>
        </div>

        {/* Returns table */}
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Marketplace</th>
                <th>Produk</th>
                <th>Qty</th>
                <th>Status</th>
                <th>Kondisi</th>
                <th>TikTok Deadline</th>
                <th>Tanggal Masuk</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {returns.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">
                      <div className="empty-state-icon">↩️</div>
                      <div className="empty-state-title">Belum ada retur</div>
                    </div>
                  </td>
                </tr>
              ) : returns.map(ret => {
                const isUrgent = ret.tiktok_claim_deadline && !ret.claim_submitted && ret.status === 'INSPECTED' &&
                  (new Date(ret.tiktok_claim_deadline).getTime() - today.getTime()) / (1000 * 60 * 60 * 24) <= 7

                return (
                  <tr key={ret.id} style={isUrgent ? { background: 'rgba(239,68,68,0.05)' } : {}}>
                    <td>
                      <span className={`badge ${ret.marketplace === 'SHOPEE' ? 'badge-warning' : 'badge-danger'}`}>
                        {ret.marketplace === 'SHOPEE' ? '🛍️' : '🎵'} {ret.marketplace}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{ret.products?.name ?? 'Unknown'}</div>
                      <div className="text-xs text-muted font-mono">{ret.products?.sku}</div>
                    </td>
                    <td className="font-bold">{ret.qty}</td>
                    <td>
                      <span className={`badge ${ret.status === 'PENDING_INSPECTION' ? 'badge-warning' : ret.status === 'INSPECTED' ? 'badge-info' : 'badge-success'}`}>
                        {ret.status === 'PENDING_INSPECTION' ? 'Pending Inspeksi' : ret.status === 'INSPECTED' ? 'Sudah Diinspeksi' : 'Diklaim'}
                      </span>
                    </td>
                    <td>
                      {ret.condition
                        ? <span className={`badge ${conditionConfig[ret.condition]?.cls}`}>{conditionConfig[ret.condition]?.label}</span>
                        : <span className="text-muted text-sm">Belum diinspeksi</span>}
                    </td>
                    <td>
                      {ret.tiktok_claim_deadline ? (
                        <div>
                          <div className={`text-sm ${isUrgent ? 'text-danger font-bold' : ''}`}>
                            {isUrgent && '⚠️ '}{ret.tiktok_claim_deadline}
                          </div>
                          {ret.claim_submitted && <div className="text-xs text-success">✅ Diklaim</div>}
                        </div>
                      ) : <span className="text-muted">—</span>}
                    </td>
                    <td className="text-muted text-sm">
                      {new Date(ret.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                    </td>
                    <td>
                      {ret.status === 'PENDING_INSPECTION' && (
                        <Link href={`/returns/${ret.id}/inspect`} className="btn btn-primary btn-sm">
                          Inspeksi →
                        </Link>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <Pagination totalPages={totalPages} currentPage={currentPage} />
      </div>
    </>
  )
}

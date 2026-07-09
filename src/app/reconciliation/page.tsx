// src/app/reconciliation/page.tsx — Rekonsiliasi & Drill-down
import { supabaseAdmin } from '@/lib/db/client'
import { ReconciliationEngine } from '@/lib/engine/reconciliation.engine'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import ExportButton from '@/components/ExportButton'

async function getReconciliationData() {
  const [todayLogs, productTotals] = await Promise.all([
    supabaseAdmin
      .from('daily_reconciliation_log')
      .select('*, products(name, sku)')
      .eq('run_date', new Date().toISOString().split('T')[0])
      .order('has_anomaly', { ascending: false }),
    supabaseAdmin
      .from('v_product_stock_total')
      .select('product_id, sku, product_name, total_qty')
      .order('total_qty', { ascending: true })
      .limit(10),
  ])

  return {
    logs: (todayLogs.data ?? []) as {
      id: string; product_id: string; computed_stock: number;
      has_anomaly: boolean; anomaly_flags: { type: string; description: string; severity: string }[] | null;
      products: { name: string; sku: string } | null
    }[],
    lowestStock: (productTotals.data ?? []) as {
      product_id: string; sku: string; product_name: string; total_qty: number
    }[],
  }
}

export default async function ReconciliationPage() {
  const data = await getReconciliationData()

  const totalAnomalies = data.logs.filter(l => l.has_anomaly).length
  const highAnomalies = data.logs.flatMap(l => l.anomaly_flags ?? []).filter(f => f.severity === 'HIGH').length

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Rekonsiliasi Stok</h1>
          <p className="page-subtitle">Selisih stok beserta penyebabnya — bukan sekadar angka</p>
        </div>
        <form action={async () => {
          'use server'
          await ReconciliationEngine.runDailyCheck()
          revalidatePath('/reconciliation')
        }}>
          <div className="flex gap-2">
            <ExportButton type="LEDGER" label="Export Ledger CSV" />
            <button type="submit" className="btn btn-primary">
              🔄 Jalankan Rekonsiliasi Harian
            </button>
          </div>
        </form>
      </div>

      <div className="page-body">
        {/* Stats */}
        <div className="grid-cols-3 mb-6">
          <div className="stat-card danger">
            <div className="text-muted text-sm mb-1">Produk dengan Anomali</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: totalAnomalies > 0 ? 'var(--accent-danger)' : 'var(--accent-success)' }}>{totalAnomalies}</div>
          </div>
          <div className="stat-card danger">
            <div className="text-muted text-sm mb-1">Anomali Tingkat Tinggi</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: highAnomalies > 0 ? 'var(--accent-danger)' : 'var(--text-muted)' }}>{highAnomalies}</div>
          </div>
          <div className="stat-card success">
            <div className="text-muted text-sm mb-1">Produk Dicek</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--accent-success)' }}>{data.logs.length}</div>
          </div>
        </div>

        {/* Anomaly List */}
        {data.logs.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">✅</div>
              <div className="empty-state-title">Belum ada hasil rekonsiliasi hari ini</div>
              <div className="text-sm text-muted mt-2">Klik "Jalankan Rekonsiliasi Harian" untuk memulai</div>
            </div>
          </div>
        ) : (
          <div className="card mb-6">
            <div style={{ fontWeight: 600, marginBottom: 16 }}>Hasil Rekonsiliasi Hari Ini</div>
            {data.logs.map(log => (
              <div key={log.id} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-semibold">{log.products?.name ?? 'Unknown'}</span>
                    <span className="text-muted text-xs font-mono ml-2">{log.products?.sku}</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="text-secondary text-sm">Stok: {log.computed_stock.toLocaleString('id-ID')}</span>
                    {log.has_anomaly
                      ? <span className="badge badge-danger">⚠️ Ada Anomali</span>
                      : <span className="badge badge-success">✅ Normal</span>}
                  </div>
                </div>

                {log.has_anomaly && log.anomaly_flags && (
                  <div style={{ paddingLeft: 12 }}>
                    {log.anomaly_flags.map((flag, idx) => (
                      <div key={idx} className={`alert-banner ${flag.severity === 'HIGH' ? 'alert-high' : 'alert-medium'} mb-2`} style={{ padding: '10px 14px' }}>
                        <span style={{ fontSize: 14 }}>{flag.severity === 'HIGH' ? '🚨' : '⚠️'}</span>
                        <div className="text-sm">{flag.description}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Lowest Stock */}
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 16 }}>10 Produk Stok Terendah</div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Produk</th>
                  <th>SKU</th>
                  <th>Stok</th>
                  <th>Status</th>
                  <th>Drill-down</th>
                </tr>
              </thead>
              <tbody>
                {data.lowestStock.map(p => (
                  <tr key={p.product_id}>
                    <td style={{ fontWeight: 500 }}>{p.product_name}</td>
                    <td className="font-mono text-muted text-xs">{p.sku}</td>
                    <td className={`font-bold ${p.total_qty <= 0 ? 'text-danger' : p.total_qty < 100 ? 'text-warning' : ''}`}>
                      {p.total_qty.toLocaleString('id-ID')}
                    </td>
                    <td>
                      {p.total_qty <= 0
                        ? <span className="badge badge-danger">Habis</span>
                        : p.total_qty < 100
                        ? <span className="badge badge-warning">Rendah</span>
                        : <span className="badge badge-success">Aman</span>}
                    </td>
                    <td>
                      <Link href={`/products/${p.product_id}`} className="btn btn-secondary btn-sm">
                        📊 Lihat Ledger
                      </Link>
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

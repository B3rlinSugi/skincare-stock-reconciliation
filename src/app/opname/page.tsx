// src/app/opname/page.tsx — Stok Opname
import { supabaseAdmin } from '@/lib/db/client'
import { startOpname } from '@/lib/actions/opname.actions'
import Link from 'next/link'
import { ClipboardList } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'

async function getOpnameSessions() {
  const { data } = await supabaseAdmin
    .from('stock_opname')
    .select('*, stock_opname_items(id, difference)')
    .order('started_at', { ascending: false })
    .limit(20)

  return (data ?? []) as {
    id: string; title: string; status: string;
    started_by: string | null; started_at: string; completed_at: string | null;
    stock_opname_items: { id: string; difference: number | null }[]
  }[]
}

export default async function OpnamePage() {
  const sessions = await getOpnameSessions()

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Stok Opname</h1>
          <p className="page-subtitle">Hitung fisik → bandingkan dengan catatan → koreksi selisih</p>
        </div>
        <form action={startOpname}>
          <div className="flex gap-2">
            <input
              name="title"
              className="form-input"
              style={{ width: 220 }}
              placeholder="Judul opname, e.g. Opname Jul 2026"
              required
            />
            <button type="submit" className="btn btn-primary">
              + Mulai Opname Baru
            </button>
          </div>
        </form>
      </div>

      <div className="page-body">
        {/* Info */}
        <div className="alert-banner alert-low mb-6">
          <span style={{ fontSize: 18 }}>ℹ️</span>
          <div className="text-sm">
            Saat opname dimulai, sistem <strong>snapshot stok saat ini</strong> dari ledger sebagai referensi. Operator kemudian memasukkan hasil hitung fisik. Selisih otomatis dibuat entry koreksi di ledger.
          </div>
        </div>

        {/* Sessions */}
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Judul</th>
                <th>Status</th>
                <th>Total Item</th>
                <th>Item Selisih</th>
                <th>Dimulai Oleh</th>
                <th>Tanggal</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState 
                      icon={ClipboardList} 
                      title="Belum ada sesi opname" 
                      description="Buat sesi opname baru untuk mulai hitung fisik" 
                    />
                  </td>
                </tr>
              ) : sessions.map(session => {
                const itemsWithDiff = session.stock_opname_items.filter(i => i.difference !== null && i.difference !== 0).length
                return (
                  <tr key={session.id}>
                    <td style={{ fontWeight: 500 }}>{session.title}</td>
                    <td>
                      <span className={`badge ${session.status === 'COMPLETED' ? 'badge-success' : session.status === 'COUNTING' ? 'badge-warning' : 'badge-neutral'}`}>
                        {session.status === 'COMPLETED' ? '✅ Selesai' : session.status === 'COUNTING' ? '🔄 Berjalan' : 'Draft'}
                      </span>
                    </td>
                    <td className="text-secondary">{session.stock_opname_items.length} item</td>
                    <td>
                      {itemsWithDiff > 0
                        ? <span className="text-warning font-bold">{itemsWithDiff} item selisih</span>
                        : <span className="text-muted">—</span>}
                    </td>
                    <td className="text-muted">{session.started_by ?? '—'}</td>
                    <td className="text-muted text-sm">
                      {new Date(session.started_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td>
                      <Link href={`/opname/${session.id}`} className="btn btn-secondary btn-sm">
                        {session.status === 'COUNTING' ? 'Lanjutkan →' : 'Lihat →'}
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

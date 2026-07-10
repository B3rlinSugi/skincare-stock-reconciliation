import { supabaseAdmin } from '@/lib/db/client'
import Link from 'next/link'

export default async function SystemLogsPage() {
  const { data: logs, error } = await supabaseAdmin
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    if (error.code === '42P01') {
      return (
        <div className="page-body flex items-center justify-center p-12 text-center">
          <div>
            <h2 className="text-xl font-semibold mb-2">Tabel Audit Log Belum Dibuat</h2>
            <p className="text-secondary mb-4">Silakan jalankan migration_7.sql di Supabase SQL Editor.</p>
          </div>
        </div>
      )
    }
    return <div>Error loading logs: {error.message}</div>
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <Link href="/settings" className="text-muted text-sm" style={{ textDecoration: 'none' }}>← Kembali ke Pengaturan</Link>
          <h1 className="page-title mt-1">Sistem Log (Audit Trail)</h1>
          <p className="page-subtitle">Riwayat perubahan data penting di dalam sistem</p>
        </div>
      </div>

      <div className="page-body">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Aksi</th>
                <th>Tabel</th>
                <th>ID Referensi</th>
                <th>Dilakukan Oleh</th>
              </tr>
            </thead>
            <tbody>
              {logs?.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-secondary">Belum ada catatan log</td></tr>
              ) : (
                logs?.map(log => (
                  <tr key={log.id}>
                    <td className="text-sm">{new Date(log.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                    <td>
                      <span className={`badge ${
                        log.action === 'INSERT' ? 'badge-success' : 
                        log.action === 'UPDATE' ? 'badge-warning' : 
                        'badge-danger'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="font-mono text-xs">{log.table_name}</td>
                    <td className="font-mono text-xs">{log.record_id}</td>
                    <td>{log.changed_by}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

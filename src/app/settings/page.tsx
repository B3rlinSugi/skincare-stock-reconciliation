import Link from 'next/link'

export default function SettingsPage() {
  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Pengaturan Sistem</h1>
          <p className="page-subtitle">Konfigurasi akun dan preferensi WMS</p>
        </div>
      </div>
      
      <div className="page-body">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4 border-b border-[var(--border-subtle)] pb-2">Profil Pengguna</h2>
            <div className="grid gap-4">
              <div>
                <label className="block text-sm text-secondary mb-1">Nama</label>
                <input type="text" className="form-input" defaultValue="Warehouse Admin" />
              </div>
              <div>
                <label className="block text-sm text-secondary mb-1">Email</label>
                <input type="email" className="form-input" defaultValue="admin@stokrekon.com" disabled />
              </div>
              <div>
                <label className="block text-sm text-secondary mb-1">Role</label>
                <input type="text" className="form-input" defaultValue="Super Admin" disabled />
              </div>
              <button className="btn btn-primary w-max mt-2">Simpan Profil</button>
            </div>
          </div>
          
          <div>
            <h2 className="text-lg font-semibold mb-4 border-b border-[var(--border-subtle)] pb-2">Preferensi Sistem</h2>
            <div className="grid gap-4">
              <label className="flex items-center gap-3">
                <input type="checkbox" defaultChecked className="w-4 h-4" />
                <span>Notifikasi suara untuk barcode scanner</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" defaultChecked className="w-4 h-4" />
                <span>Peringatan stok di bawah batas minimum</span>
              </label>
              <button className="btn btn-secondary w-max mt-2">Simpan Preferensi</button>
            </div>
          </div>
          
          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-4 border-b border-[var(--border-subtle)] pb-2">Administrasi Keamanan</h2>
            <div className="grid gap-4">
              <p className="text-sm text-secondary">Lihat semua riwayat aktivitas (audit trail) untuk memantau perubahan data.</p>
              <Link href="/settings/logs" className="btn btn-secondary w-max flex items-center gap-2">
                <span>📋</span> Buka Log Sistem
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

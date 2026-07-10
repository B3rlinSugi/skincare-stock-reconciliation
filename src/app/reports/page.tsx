import { ReportExportClient } from './ReportExportClient'

export default function ReportsPage() {
  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Laporan & Ekspor</h1>
          <p className="page-subtitle">Unduh data pergerakan stok dan performa gudang</p>
        </div>
      </div>
      
      <div className="page-body grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <div className="text-4xl mb-4">📊</div>
          <h2 className="text-lg font-semibold mb-2">Riwayat Pergerakan Stok (Buku Besar)</h2>
          <p className="text-secondary text-sm mb-6">
            Laporan lengkap seluruh pergerakan barang masuk, keluar, retur, dan penyesuaian (opname). 
            Berisi maksimal 1000 data terakhir untuk diolah lebih lanjut di Excel/Google Sheets.
          </p>
          <ReportExportClient />
        </div>
        
        <div className="card" style={{ opacity: 0.6 }}>
          <div className="text-4xl mb-4">📑</div>
          <h2 className="text-lg font-semibold mb-2">Laporan Nilai Valuasi Aset</h2>
          <p className="text-secondary text-sm mb-6">
            Estimasi total nilai stok yang ada di gudang berdasarkan harga beli. 
          </p>
          <button className="btn btn-secondary" disabled>Segera Hadir</button>
        </div>
      </div>
    </div>
  )
}

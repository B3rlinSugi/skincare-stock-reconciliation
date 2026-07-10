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
      
      <div className="page-body grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        <div className="card h-full flex flex-col justify-between">
          <div>
            <div className="text-4xl mb-4">📊</div>
            <h2 className="text-lg font-semibold mb-2">Riwayat Pergerakan Stok (Buku Besar)</h2>
            <p className="text-secondary text-sm mb-6">
              Laporan lengkap seluruh pergerakan barang masuk, keluar, retur, dan penyesuaian (opname). 
              Berisi maksimal 1000 data terakhir untuk diolah lebih lanjut di Excel/Google Sheets.
            </p>
          </div>
          <div>
            <ReportExportClient />
          </div>
        </div>
        
        <div className="card h-full flex flex-col justify-between" style={{ opacity: 0.6 }}>
          <div>
            <div className="text-4xl mb-4">📑</div>
            <h2 className="text-lg font-semibold mb-2">Laporan Nilai Valuasi Aset</h2>
            <p className="text-secondary text-sm mb-6">
              Estimasi total nilai stok yang ada di gudang berdasarkan harga beli. 
            </p>
          </div>
          <div>
            <button className="btn btn-secondary w-full" disabled>Segera Hadir</button>
          </div>
        </div>
      </div>
    </div>
  )
}

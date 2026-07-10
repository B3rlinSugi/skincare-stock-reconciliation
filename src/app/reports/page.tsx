// src/app/reports/page.tsx
export default function ReportsPage() {
  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Laporan</h1>
          <p className="page-subtitle">Unduh data pergerakan stok dan performa gudang</p>
        </div>
      </div>
      
      <div className="page-body flex items-center justify-center p-12 text-center text-secondary">
        <div>
          <h2 className="text-xl font-semibold mb-2">Segera Hadir</h2>
          <p>Fitur export laporan dalam format PDF dan Excel sedang dalam pengembangan.</p>
        </div>
      </div>
    </div>
  )
}

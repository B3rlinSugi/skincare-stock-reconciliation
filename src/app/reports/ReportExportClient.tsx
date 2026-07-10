'use client'

import { useState } from 'react'
import { supabase } from '@/lib/db/browser'

export function ReportExportClient() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const downloadCSV = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error: fetchError } = await supabase
        .from('stock_ledger')
        .select('*, products(sku, name)')
        .order('created_at', { ascending: false })
        .limit(1000)

      if (fetchError) throw fetchError
      if (!data || data.length === 0) {
        setError('Tidak ada data untuk diekspor')
        return
      }

      // Format CSV
      const headers = ['ID Ledger', 'Waktu', 'SKU', 'Nama Produk', 'Tipe Pergerakan', 'Kanal', 'Jumlah (Unit)', 'Referensi', 'Catatan', 'Oleh']
      const rows = data.map(row => [
        row.id,
        new Date(row.created_at).toLocaleString('id-ID'),
        row.products?.sku || '',
        `"${(row.products?.name || '').replace(/"/g, '""')}"`,
        row.movement_type,
        row.channel || '',
        row.quantity,
        row.reference_type || '',
        `"${(row.notes || '').replace(/"/g, '""')}"`,
        row.created_by || ''
      ])

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Laporan_Pergerakan_Stok_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {error && <div className="text-danger text-sm mb-2">{error}</div>}
      <button 
        onClick={downloadCSV} 
        disabled={loading}
        className="btn btn-primary"
      >
        {loading ? 'Menyiapkan Data...' : '📥 Ekspor CSV'}
      </button>
    </div>
  )
}

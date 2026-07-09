'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { supabaseClient } from '@/lib/db/client'

type ExportType = 'PRODUCTS' | 'LEDGER'

export default function ExportButton({ type, label = 'Export to CSV' }: { type: ExportType; label?: string }) {
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    setLoading(true)
    try {
      let csvContent = ''
      
      if (type === 'PRODUCTS') {
        const { data, error } = await supabaseClient
          .from('products')
          .select('sku, name, product_stock_summary(total_qty)')
          .order('name')
        
        if (error) throw error
        
        // Header
        csvContent += 'SKU,Product Name,Total Stock\n'
        data.forEach((row: any) => {
          const qty = row.product_stock_summary?.[0]?.total_qty || 0
          // Escape quotes in name
          const safeName = `"${row.name.replace(/"/g, '""')}"`
          csvContent += `${row.sku},${safeName},${qty}\n`
        })
      } else if (type === 'LEDGER') {
        const { data, error } = await supabaseClient
          .from('stock_ledger')
          .select('id, created_at, movement_type, channel, quantity, batch_id, products(name, sku)')
          .order('created_at', { ascending: false })
          .limit(1000) // Exporting last 1000 for safety, could be paginated in real app
          
        if (error) throw error
        
        // Header
        csvContent += 'Date,Transaction ID,SKU,Product,Movement,Channel,Qty,Batch ID\n'
        data.forEach((row: any) => {
          const date = new Date(row.created_at).toISOString()
          const sku = row.products?.sku || ''
          const name = `"${(row.products?.name || '').replace(/"/g, '""')}"`
          csvContent += `${date},${row.id},${sku},${name},${row.movement_type},${row.channel},${row.quantity},${row.batch_id || ''}\n`
        })
      }

      // Create a Blob and trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `export_${type.toLowerCase()}_${new Date().getTime()}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error('Export failed', err)
      alert('Failed to export data')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button 
      onClick={handleExport} 
      disabled={loading}
      className="btn btn-secondary btn-sm"
      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
    >
      <Download size={14} />
      {loading ? 'Exporting...' : label}
    </button>
  )
}

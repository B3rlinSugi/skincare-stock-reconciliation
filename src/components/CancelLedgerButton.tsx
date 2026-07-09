'use client'

import { useState } from 'react'
import { voidLedgerEntry } from '@/lib/actions/ledger.actions'

export default function CancelLedgerButton({ ledgerId }: { ledgerId: string }) {
  const [loading, setLoading] = useState(false)
  
  async function handleCancel() {
    if (!confirm('Apakah Anda yakin ingin membatalkan transaksi ini? Aksi ini akan mengembalikan stok seperti semula dan tercatat di ledger.')) {
      return
    }
    
    setLoading(true)
    const res = await voidLedgerEntry(ledgerId)
    
    if (!res.success) {
      alert(`Gagal membatalkan transaksi: ${res.error}`)
      setLoading(false)
    }
  }

  return (
    <button 
      onClick={handleCancel}
      disabled={loading}
      className="btn btn-sm btn-danger"
      style={{ padding: '2px 8px', fontSize: 11 }}
    >
      {loading ? '⏳' : 'Batalkan'}
    </button>
  )
}

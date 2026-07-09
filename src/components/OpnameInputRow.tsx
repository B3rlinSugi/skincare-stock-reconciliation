'use client'

import { useState, useEffect } from 'react'
import { saveOpnameItemPhysicalQty } from '@/lib/actions/opname.actions'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export default function OpnameInputRow({
  item,
}: {
  item: {
    id: string
    system_qty: number
    physical_qty: number | null
    difference: number | null
  }
}) {
  const [value, setValue] = useState(item.physical_qty?.toString() ?? '')
  const [saveState, setSaveState] = useState<SaveState>('idle')

  useEffect(() => {
    // If the value hasn't changed from original, do nothing
    if (value === (item.physical_qty?.toString() ?? '')) return
    // If empty string, do nothing
    if (value === '') return

    const numericValue = parseInt(value, 10)
    if (isNaN(numericValue) || numericValue < 0) return

    setSaveState('saving')

    const timer = setTimeout(async () => {
      try {
        const res = await saveOpnameItemPhysicalQty(item.id, numericValue)
        if (res.success) {
          setSaveState('saved')
          setTimeout(() => setSaveState('idle'), 2000)
        } else {
          setSaveState('error')
        }
      } catch (err) {
        setSaveState('error')
      }
    }, 750) // 750ms debounce

    return () => clearTimeout(timer)
  }, [value, item.id, item.physical_qty])

  const diff = value !== '' ? parseInt(value) - item.system_qty : item.difference

  return (
    <>
      <td>
        <div className="flex items-center gap-2">
          <input
            type="number"
            className="form-input w-24"
            style={{ padding: '4px 8px', height: 32 }}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={item.system_qty.toString()}
            min="0"
          />
          {saveState === 'saving' && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
          {saveState === 'saved' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
          {saveState === 'error' && <XCircle className="w-4 h-4 text-red-500" title="Gagal menyimpan" />}
        </div>
      </td>
      <td>
        {diff === null || isNaN(diff) ? (
          <span className="text-muted">—</span>
        ) : diff === 0 ? (
          <span className="text-success">Cocok</span>
        ) : diff > 0 ? (
          <span className="text-success font-bold">+{diff}</span>
        ) : (
          <span className="text-danger font-bold">{diff}</span>
        )}
      </td>
    </>
  )
}

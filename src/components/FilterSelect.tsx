'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'

interface Option {
  value: string
  label: string
}

export default function FilterSelect({ paramName, options, placeholder = 'Semua' }: { paramName: string, options: Option[], placeholder?: string }) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { replace } = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleFilter = (val: string) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', '1') // reset page
    
    if (val) {
      params.set(paramName, val)
    } else {
      params.delete(paramName)
    }

    startTransition(() => {
      replace(`${pathname}?${params.toString()}`)
    })
  }

  return (
    <div style={{ position: 'relative' }}>
      <select
        className="form-input"
        defaultValue={searchParams.get(paramName)?.toString() || ''}
        onChange={(e) => handleFilter(e.target.value)}
        style={{ minWidth: 150 }}
      >
        <option value="">{placeholder}</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {isPending && (
        <div style={{ position: 'absolute', right: 30, top: '50%', transform: 'translateY(-50%)' }}>
          ⏳
        </div>
      )}
    </div>
  )
}

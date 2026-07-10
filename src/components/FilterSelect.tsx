'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTransition, Suspense } from 'react'
import { CustomSelect } from './CustomSelect'

interface Option {
  value: string
  label: string
}

function FilterSelectInner({ paramName, options, placeholder = 'Semua' }: { paramName: string, options: Option[], placeholder?: string }) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { replace } = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleFilter = (val: string) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', '1')
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
      <div style={{ minWidth: 180 }}>
        <CustomSelect
          value={searchParams.get(paramName)?.toString() || ''}
          onChange={handleFilter}
          options={options}
          placeholder={placeholder}
        />
      </div>
      {isPending && (
        <div style={{ position: 'absolute', right: -24, top: '50%', transform: 'translateY(-50%)' }}>
          ⏳
        </div>
      )}
    </div>
  )
}

export default function FilterSelect({ paramName, options, placeholder = 'Semua' }: { paramName: string, options: Option[], placeholder?: string }) {
  return (
    <Suspense fallback={<div className="form-input" style={{ minWidth: 180, background: 'rgba(0, 0, 0, 0.2)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span>{placeholder}</span><span style={{opacity: 0.5}}>▼</span></div>}>
      <FilterSelectInner paramName={paramName} options={options} placeholder={placeholder} />
    </Suspense>
  )
}

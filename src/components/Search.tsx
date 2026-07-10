'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTransition, Suspense } from 'react'

function SearchInput({ placeholder }: { placeholder: string }) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { replace } = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleSearch = (term: string) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', '1')
    if (term) {
      params.set('query', term)
    } else {
      params.delete('query')
    }
    startTransition(() => {
      replace(`${pathname}?${params.toString()}`)
    })
  }

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 400 }}>
      <input
        type="text"
        className="form-input"
        placeholder={placeholder}
        defaultValue={searchParams.get('query')?.toString()}
        onChange={(e) => handleSearch(e.target.value)}
        style={{ paddingLeft: 36 }}
      />
      <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>
        🔍
      </div>
      {isPending && (
        <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
          ⏳
        </div>
      )}
    </div>
  )
}

export default function Search({ placeholder }: { placeholder: string }) {
  return (
    <Suspense fallback={<div style={{ width: '100%', maxWidth: 400 }}><input className="form-input" placeholder={placeholder} style={{ paddingLeft: 36 }} disabled /></div>}>
      <SearchInput placeholder={placeholder} />
    </Suspense>
  )
}

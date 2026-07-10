'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

interface PaginationProps {
  totalPages: number
  currentPage: number
}

function PaginationInner({ totalPages, currentPage }: PaginationProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  if (totalPages <= 1) return null

  const createPageURL = (pageNumber: number | string) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', pageNumber.toString())
    return `${pathname}?${params.toString()}`
  }

  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 24, justifyContent: 'center', alignItems: 'center' }}>
      <Link
        href={createPageURL(currentPage - 1)}
        className="btn btn-secondary"
        style={{ pointerEvents: currentPage <= 1 ? 'none' : 'auto', opacity: currentPage <= 1 ? 0.5 : 1 }}
      >
        &laquo; Prev
      </Link>
      
      <div className="text-sm font-semibold">
        Page {currentPage} of {totalPages}
      </div>

      <Link
        href={createPageURL(currentPage + 1)}
        className="btn btn-secondary"
        style={{ pointerEvents: currentPage >= totalPages ? 'none' : 'auto', opacity: currentPage >= totalPages ? 0.5 : 1 }}
      >
        Next &raquo;
      </Link>
    </div>
  )
}

export default function Pagination({ totalPages, currentPage }: PaginationProps) {
  return (
    <Suspense fallback={null}>
      <PaginationInner totalPages={totalPages} currentPage={currentPage} />
    </Suspense>
  )
}

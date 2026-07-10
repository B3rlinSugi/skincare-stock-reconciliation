'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function MasterDataLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const tabs = [
    { href: '/master/products', label: 'Produk' },
    { href: '/master/categories', label: 'Kategori' },
    { href: '/master/suppliers', label: 'Supplier' },
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Master Data</h1>
          <p className="page-subtitle">Kelola data inti untuk operasi gudang</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, marginBottom: 24, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12, paddingLeft: 48, paddingRight: 48 }}>
        {tabs.map(tab => {
          const isActive = pathname === tab.href
          return (
            <Link 
              key={tab.href} 
              href={tab.href}
              style={{
                fontSize: 14,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                position: 'relative'
              }}
            >
              {tab.label}
              {isActive && (
                <div style={{ position: 'absolute', bottom: -13, left: 0, right: 0, height: 2, background: 'var(--accent-primary)', borderRadius: '2px 2px 0 0' }} />
              )}
            </Link>
          )
        })}
      </div>

      <div>
        {children}
      </div>
    </div>
  )
}

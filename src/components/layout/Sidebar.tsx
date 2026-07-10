'use client'
// src/components/layout/Sidebar.tsx

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  LayoutGrid, 
  Package, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  ShoppingCart, 
  Undo2, 
  ClipboardCheck, 
  Scale, 
  Gamepad2,
  Hexagon,
  Database,
  BarChart3,
  Settings
} from 'lucide-react'

const navItems = [
  {
    section: 'Overview',
    items: [
      { href: '/', label: 'Dashboard', icon: LayoutGrid },
      { href: '/products', label: 'Inventory', icon: Package },
    ],
  },
  {
    section: 'Movements',
    items: [
      { href: '/inbound', label: 'Inbound', icon: ArrowDownToLine },
      { href: '/outbound', label: 'Outbound', icon: ArrowUpFromLine },
      { href: '/orders', label: 'Orders', icon: ShoppingCart },
      { href: '/returns', label: 'Returns', icon: Undo2, badge: '!' },
    ],
  },
  {
    section: 'Reconciliation',
    items: [
      { href: '/opname', label: 'Stock Opname', icon: ClipboardCheck },
      { href: '/reconciliation', label: 'Ledger Recon', icon: Scale },
    ],
  },
  {
    section: 'Data & Reports',
    items: [
      { href: '/master', label: 'Master Data', icon: Database },
      { href: '/reports', label: 'Reports', icon: BarChart3 },
    ],
  },
  {
    section: 'System',
    items: [
      { href: '/settings', label: 'Settings', icon: Settings },
      { href: '/simulation', label: 'Event Simulator', icon: Gamepad2 },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="sidebar">
      {/* Logo Area */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Hexagon size={16} fill="currentColor" />
        </div>
        <div>
          <div className="sidebar-logo-text">StokRekon</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((section, sectionIdx) => (
          <div key={section.section} style={{ marginBottom: 12 }}>
            <div className="sidebar-section-label">{section.section}</div>
            {section.items.map((item) => {
              const isActive = item.href === '/' 
                ? pathname === '/' 
                : pathname.startsWith(item.href)
              
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                >
                  <div className="nav-icon">
                    <Icon size={14} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="nav-badge">{item.badge}</span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer / User Profile snippet */}
      <div style={{ 
        marginTop: 'auto', 
        padding: '16px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: 12, 
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 16,
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-info), var(--accent-primary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', boxShadow: '0 0 15px rgba(59,130,246,0.5)' }}>
          WA
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>Warehouse Admin</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Admin</div>
        </div>
      </div>
    </aside>
  )
}

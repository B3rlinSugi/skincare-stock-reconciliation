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
                  {/* Subtle active background animated with framer motion layoutId */}
                  {isActive && (
                    <motion.div
                      layoutId="active-nav"
                      className="absolute inset-0 bg-white/10 rounded-lg -z-10"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      style={{ background: 'rgba(255,255,255,0.06)', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 8, zIndex: -1 }}
                    />
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer / User Profile snippet */}
      <div style={{ marginTop: 'auto', padding: '16px', display: 'flex', alignItems: 'center', gap: 12, borderTop: '1px solid var(--border-subtle)' }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-primary), #a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#000' }}>
          WA
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>Warehouse Admin</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Pro Plan</div>
        </div>
      </div>
    </aside>
  )
}

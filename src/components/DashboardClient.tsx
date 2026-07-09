'use client'
// src/components/DashboardClient.tsx

import Link from 'next/link'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { useEffect } from 'react'
import { 
  Package, 
  AlertTriangle, 
  TrendingDown, 
  Undo2, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  Gamepad2, 
  Clock,
  ChevronRight,
  ShieldAlert,
  Search,
  MoreHorizontal
} from 'lucide-react'

// Bento Grid Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 350, damping: 25 } }
}

const tableVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } }
}
const rowVariants = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } }
}

// Animated Counter Component
function AnimatedNumber({ value }: { value: number }) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (latest) => Math.round(latest).toLocaleString('id-ID'))

  useEffect(() => {
    const controls = animate(count, value, { duration: 1.5, type: 'spring', bounce: 0 })
    return controls.stop
  }, [value, count])

  return <motion.span>{rounded}</motion.span>
}

const channelLabel: Record<string, string> = {
  MAKLON: 'Inbound Maklon', SHOPEE: 'Shopee Order', TIKTOK: 'TikTok Shop', OFFLINE: 'Offline POS',
  BONUS: 'Customer Bonus', PROMO: 'Promo', SAMPLE: 'Sample', DAMAGED: 'Damaged', EXPIRED: 'Expired',
}

export default function DashboardClient({ data }: { data: any }) {
  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Overview</h1>
          <p className="page-subtitle">Real-time inventory metrics</p>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-secondary">
            <Search size={14} /> Search
          </button>
          <Link href="/reconciliation" className="btn btn-primary">
            Run Reconciliation
          </Link>
        </div>
      </div>

      <motion.div 
        className="page-body"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* Urgent Alerts - Linear Style Soft Banner */}
        {data.tiktokUrgent?.length > 0 && (
          <motion.div variants={itemVariants}>
            {data.tiktokUrgent.map((ret: any) => (
              <div key={ret.id} className="alert-banner alert-high flex justify-between items-center">
                <div className="flex gap-4 items-center">
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(229, 72, 77, 0.15)', color: 'var(--accent-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShieldAlert size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
                      TikTok SLA Warning: {ret.products?.name ?? 'Unknown'}
                    </div>
                    <div className="text-sm text-muted mt-1">
                      Action required before {ret.tiktok_claim_deadline} for {ret.qty} units.
                    </div>
                  </div>
                </div>
                <Link href="/returns" className="btn btn-secondary btn-sm" style={{ border: '1px solid rgba(229,72,77,0.3)', color: 'var(--accent-danger)' }}>
                  Resolve Issue
                </Link>
              </div>
            ))}
          </motion.div>
        )}

        {/* Bento Grid layout */}
        <div className="grid-cols-4 mb-6">
          <motion.div variants={itemVariants} className="card col-span-1">
            <div className="text-muted text-xs font-medium mb-4 flex items-center justify-between">
              ACTIVE SKUS <Package size={14} opacity={0.5} />
            </div>
            <div style={{ fontSize: 42, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1, color: 'var(--text-primary)' }}>
              <AnimatedNumber value={data.totalProducts} />
            </div>
            <div className="text-muted text-xs mt-3 flex gap-2 items-center">
              <span className="badge badge-neutral">+2 this week</span>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="card col-span-1">
            <div className="text-muted text-xs font-medium mb-4 flex items-center justify-between">
              STOCK DEPLETED <AlertTriangle size={14} className="text-danger" />
            </div>
            <div style={{ fontSize: 42, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1, color: data.zeroStock > 0 ? 'var(--accent-danger)' : 'var(--text-primary)' }}>
              <AnimatedNumber value={data.zeroStock} />
            </div>
            <div className="text-muted text-xs mt-3">items require restock</div>
          </motion.div>

          <motion.div variants={itemVariants} className="card col-span-1">
            <div className="text-muted text-xs font-medium mb-4 flex items-center justify-between">
              LOW STOCK <TrendingDown size={14} className="text-warning" />
            </div>
            <div style={{ fontSize: 42, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1, color: data.lowStock > 0 ? 'var(--accent-warning)' : 'var(--text-primary)' }}>
              <AnimatedNumber value={data.lowStock} />
            </div>
            <div className="text-muted text-xs mt-3">items &lt; 100 units</div>
          </motion.div>

          <motion.div variants={itemVariants} className="card col-span-1">
            <div className="text-muted text-xs font-medium mb-4 flex items-center justify-between">
              PENDING RETURNS <Undo2 size={14} className="text-info" />
            </div>
            <div style={{ fontSize: 42, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1, color: data.pendingReturns.length > 0 ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
              <AnimatedNumber value={data.pendingReturns.length} />
            </div>
            <div className="text-muted text-xs mt-3">awaiting inspection</div>
          </motion.div>
        </div>

        {/* Action Bento Cards */}
        <div className="grid-cols-3 mb-6">
          <motion.div variants={itemVariants}>
            <Link href="/inbound" className="card bento-card h-full">
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(38,181,206,0.1)', color: 'var(--accent-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                <ArrowDownToLine size={24} />
              </div>
              <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 15, color: 'var(--text-primary)' }}>Inbound Delivery</div>
              <div className="text-muted text-sm leading-relaxed">Record incoming shipments from Maklon with precise batch and expiry tracking.</div>
            </Link>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Link href="/outbound" className="card bento-card h-full">
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(229,72,77,0.1)', color: 'var(--accent-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                <ArrowUpFromLine size={24} />
              </div>
              <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 15, color: 'var(--text-primary)' }}>Manual Outbound</div>
              <div className="text-muted text-sm leading-relaxed">Log non-sale movements including promos, samples, and damaged goods disposal.</div>
            </Link>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Link href="/simulation" className="card bento-card h-full">
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(94,106,210,0.1)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                <Gamepad2 size={24} />
              </div>
              <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 15, color: 'var(--text-primary)' }}>Marketplace Sim</div>
              <div className="text-muted text-sm leading-relaxed">Inject synthetic events to test system load and reconciliation accuracy.</div>
            </Link>
          </motion.div>
        </div>

        {/* Ledger Activity Table */}
        <motion.div variants={itemVariants} className="card" style={{ padding: 0 }}>
          <div className="flex items-center justify-between" style={{ padding: '24px 32px' }}>
            <div style={{ fontWeight: 600, fontSize: 15, display: 'flex', gap: 10, alignItems: 'center' }}>
              <Clock size={16} className="text-secondary" /> Activity Log
            </div>
            <Link href="/products" className="btn btn-secondary btn-sm" style={{ background: 'transparent' }}>View All <ChevronRight size={14}/></Link>
          </div>
          
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th style={{ paddingLeft: 32 }}>Item</th>
                  <th>Action</th>
                  <th>Source</th>
                  <th>Quantity</th>
                  <th>Timestamp</th>
                  <th style={{ paddingRight: 32 }}></th>
                </tr>
              </thead>
              <motion.tbody variants={tableVariants} initial="hidden" animate="show">
                {data.recentLedger.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 0 }}>
                      <div className="empty-state">
                        <Clock className="empty-state-icon mx-auto" size={32} />
                        <div className="empty-state-title mt-4">No recent activity</div>
                        <div className="text-sm text-muted">Ledger is currently empty.</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  data.recentLedger.map((entry: any) => (
                    <motion.tr variants={rowVariants} key={entry.id}>
                      <td style={{ paddingLeft: 32, fontWeight: 500 }}>{entry.products?.name ?? '—'}</td>
                      <td>
                        <span className={`badge ${entry.movement_type === 'INBOUND' ? 'badge-success' : entry.movement_type === 'OUTBOUND' ? 'badge-danger' : entry.movement_type === 'RETURN_IN' ? 'badge-info' : 'badge-warning'}`}>
                          {entry.movement_type}
                        </span>
                      </td>
                      <td><span className="text-muted font-mono">{channelLabel[entry.channel] ?? entry.channel}</span></td>
                      <td>
                        <span className={`font-mono ${entry.quantity > 0 ? 'text-success' : 'text-danger'}`}>
                          {entry.quantity > 0 ? '+' : ''}{entry.quantity.toLocaleString('id-ID')}
                        </span>
                      </td>
                      <td className="text-muted text-sm font-mono">
                        {new Date(entry.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ paddingRight: 32, textAlign: 'right' }}>
                        <button className="btn btn-secondary btn-sm" style={{ padding: 6, background: 'transparent', border: 'none' }}>
                          <MoreHorizontal size={16} className="text-secondary" />
                        </button>
                      </td>
                    </motion.tr>
                  ))
                )}
              </motion.tbody>
            </table>
          </div>
        </motion.div>

      </motion.div>
    </>
  )
}

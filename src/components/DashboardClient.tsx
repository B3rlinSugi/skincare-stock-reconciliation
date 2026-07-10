'use client'
// src/components/DashboardClient.tsx

import Link from 'next/link'
import { motion, useMotionValue, useTransform, animate, type Variants } from 'framer-motion'
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
import { StatCard } from './StatCard'
import { EmptyState } from './EmptyState'

// Bento Grid Animation Variants
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 350, damping: 25 } }
}

const tableVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } }
}
const rowVariants: Variants = {
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
        <div className="flex gap-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted" />
            <input type="text" placeholder="Search..." className="form-input pl-9 w-64" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)' }} />
          </div>
          <Link href="/reconciliation" className="btn btn-primary" style={{ background: 'linear-gradient(90deg, #8B5CF6, #3B82F6)' }}>
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
        {/* Urgent Alerts */}
        {data.tiktokUrgent?.length > 0 && (
          <motion.div variants={itemVariants}>
            {data.tiktokUrgent.map((ret: any) => (
              <div key={ret.id} className="alert-banner alert-high flex justify-between items-center" style={{ borderLeftColor: 'var(--accent-danger)' }}>
                <div className="flex gap-4 items-center">
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(236, 72, 153, 0.15)', color: 'var(--accent-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                <Link href="/returns" className="btn btn-secondary btn-sm" style={{ border: '1px solid rgba(236,72,153,0.3)', color: 'var(--accent-danger)' }}>
                  Resolve Issue
                </Link>
              </div>
            ))}
          </motion.div>
        )}

        <div className="grid-cols-4 mb-6">
          <motion.div variants={itemVariants} className="col-span-1">
            <StatCard 
              title="ACTIVE SKUS"
              value={data.totalProducts}
              subtitle="+2 this week"
              icon={Package}
              colorClass="text-info"
              borderColorClass="rgba(139, 92, 246, 0.3)"
              bgAlphaClass="rgba(139, 92, 246, 0.2)"
              glowColorClass="rgba(139, 92, 246, 0.5)"
            />
          </motion.div>

          <motion.div variants={itemVariants} className="col-span-1">
            <StatCard 
              title="STOCK DEPLETED"
              value={data.zeroStock}
              subtitle="items need restock"
              icon={AlertTriangle}
              colorClass={data.zeroStock > 0 ? "text-danger" : "text-primary"}
              borderColorClass="rgba(236, 72, 153, 0.3)"
              bgAlphaClass="rgba(236, 72, 153, 0.15)"
              glowColorClass="rgba(236, 72, 153, 0.5)"
            />
          </motion.div>

          <motion.div variants={itemVariants} className="col-span-1">
            <StatCard 
              title="LOW STOCK"
              value={data.lowStock}
              subtitle="items < 100 units"
              icon={TrendingDown}
              colorClass={data.lowStock > 0 ? "text-warning" : "text-primary"}
              borderColorClass="rgba(245, 158, 11, 0.3)"
              bgAlphaClass="rgba(245, 158, 11, 0.15)"
              glowColorClass="rgba(245, 158, 11, 0.5)"
            />
          </motion.div>

          <motion.div variants={itemVariants} className="col-span-1">
            <StatCard 
              title="PENDING RETURNS"
              value={data.pendingReturns.length}
              subtitle="awaiting inspection"
              icon={Undo2}
              colorClass={data.pendingReturns.length > 0 ? "text-info" : "text-primary"}
              borderColorClass="rgba(59, 130, 246, 0.3)"
              bgAlphaClass="rgba(59, 130, 246, 0.15)"
              glowColorClass="rgba(59, 130, 246, 0.5)"
            />
          </motion.div>
        </div>

        {/* Action Bento Cards */}
        <div className="grid-cols-3 mb-6">
          <motion.div variants={itemVariants}>
            <div className="card h-full flex-col justify-between" style={{ borderColor: 'rgba(6, 182, 212, 0.2)' }}>
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div style={{ width: 56, height: 56, borderRadius: 16, border: '1px solid rgba(6,182,212,0.4)', background: 'rgba(6,182,212,0.1)', color: 'var(--accent-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px var(--accent-success-glow), inset 0 0 10px var(--accent-success-glow)' }}>
                    <ArrowDownToLine size={28} />
                  </div>
                  <ArrowDownToLine size={16} opacity={0.3} className="text-success" />
                </div>
                <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 18, color: 'var(--text-primary)' }}>Inbound Delivery</div>
                <div className="text-muted text-sm leading-relaxed mb-6">Record incoming shipments from Maklon with precise batch and expiry tracking.</div>
              </div>
              <Link href="/inbound" className="btn btn-secondary" style={{ width: 'max-content', border: '1px solid rgba(6,182,212,0.3)', color: 'var(--accent-success)' }}>
                New Inbound
              </Link>
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <div className="card h-full flex-col justify-between" style={{ borderColor: 'rgba(236, 72, 153, 0.2)' }}>
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div style={{ width: 56, height: 56, borderRadius: 16, border: '1px solid rgba(236,72,153,0.4)', background: 'rgba(236,72,153,0.1)', color: 'var(--accent-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px var(--accent-danger-glow), inset 0 0 10px var(--accent-danger-glow)' }}>
                    <ArrowUpFromLine size={28} />
                  </div>
                  <ArrowUpFromLine size={16} opacity={0.3} className="text-danger" />
                </div>
                <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 18, color: 'var(--text-primary)' }}>Manual Outbound</div>
                <div className="text-muted text-sm leading-relaxed mb-6">Log non-sale movements including promos, and damaged goods disposal.</div>
              </div>
              <Link href="/outbound" className="btn btn-secondary" style={{ width: 'max-content', border: '1px solid rgba(139,92,246,0.3)', color: 'var(--accent-primary)' }}>
                New Outbound
              </Link>
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <div className="card h-full flex-col justify-between" style={{ borderColor: 'rgba(59, 130, 246, 0.2)' }}>
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div style={{ width: 56, height: 56, borderRadius: 16, border: '1px solid rgba(59,130,246,0.4)', background: 'rgba(59,130,246,0.1)', color: 'var(--accent-info)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px var(--accent-info-glow), inset 0 0 10px var(--accent-info-glow)' }}>
                    <Gamepad2 size={28} />
                  </div>
                  <Gamepad2 size={16} opacity={0.3} className="text-info" />
                </div>
                <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 18, color: 'var(--text-primary)' }}>Marketplace Sim</div>
                <div className="text-muted text-sm leading-relaxed mb-6">Inject synthetic events to test system load and reconciliation accuracy.</div>
              </div>
              <Link href="/simulation" className="btn btn-secondary" style={{ width: 'max-content', border: '1px solid rgba(59,130,246,0.3)', color: 'var(--accent-info)' }}>
                Open Simulator
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Ledger Activity Table */}
        <motion.div variants={itemVariants} className="card" style={{ padding: 0 }}>
          <div className="flex items-center justify-between" style={{ padding: '24px 32px' }}>
            <div style={{ fontWeight: 600, fontSize: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
              <Clock size={18} className="text-secondary" /> Activity Log
            </div>
            <Link href="/products" className="btn btn-secondary btn-sm" style={{ background: 'transparent', border: 'none' }}>View All <ChevronRight size={14}/></Link>
          </div>
          
          <div className="table-container" style={{ border: 'none', borderRadius: 0, background: 'transparent' }}>
            <table>
              <thead>
                <tr>
                  <th style={{ paddingLeft: 32, width: '40%' }}>Item</th>
                  <th style={{ width: '15%' }}>Action</th>
                  <th style={{ width: '15%' }}>Source</th>
                  <th style={{ width: '15%' }}>Quantity</th>
                  <th style={{ width: '15%' }}>Timestamp</th>
                  <th style={{ paddingRight: 32, width: '48px' }}></th>
                </tr>
              </thead>
              <motion.tbody variants={tableVariants} initial="hidden" animate="show">
                {data.recentLedger.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 0 }}>
                      <EmptyState 
                        icon={Clock} 
                        title="No recent activity" 
                        description="Ledger is currently empty." 
                      />
                    </td>
                  </tr>
                ) : (
                  data.recentLedger.map((entry: any) => (
                    <motion.tr variants={rowVariants} key={entry.id}>
                      <td style={{ paddingLeft: 32, fontWeight: 600, color: 'var(--text-primary)' }}>{entry.products?.name ?? '—'}</td>
                      <td>
                        <span className={`badge ${entry.movement_type === 'INBOUND' ? 'badge-info' : entry.movement_type === 'OUTBOUND' ? 'badge-danger' : entry.movement_type === 'RETURN_IN' ? 'badge-success' : 'badge-warning'}`}>
                          {entry.movement_type}
                        </span>
                      </td>
                      <td><span className="text-muted">{channelLabel[entry.channel] ?? entry.channel}</span></td>
                      <td>
                        <span className={`font-mono font-bold ${entry.quantity > 0 ? 'text-success' : 'text-danger'}`} style={{ textShadow: entry.quantity > 0 ? '0 0 10px var(--accent-success-glow)' : '0 0 10px var(--accent-danger-glow)' }}>
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

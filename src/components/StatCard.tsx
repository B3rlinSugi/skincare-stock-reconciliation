import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  colorClass: string // e.g. 'text-primary', 'text-warning', 'text-danger'
  borderColorClass: string // e.g. 'rgba(139, 92, 246, 0.3)'
  bgAlphaClass: string // e.g. 'rgba(139, 92, 246, 0.2)'
  glowColorClass: string // e.g. 'rgba(139, 92, 246, 0.5)'
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  colorClass,
  borderColorClass,
  bgAlphaClass,
  glowColorClass
}: StatCardProps) {
  return (
    <div className="stat-card flex flex-col justify-between h-full" style={{ borderColor: borderColorClass }}>
      <div className="form-label mb-2 flex items-center justify-between">
        <div style={{ width: 32, height: 32, borderRadius: 8, background: bgAlphaClass, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} className={colorClass} />
        </div>
      </div>
      <div className="text-muted text-xs font-medium mb-1 mt-4">{title}</div>
      <div className="flex justify-between items-end">
        <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1, color: 'var(--text-primary)', textShadow: '0 0 20px rgba(255,255,255,0.2)' }}>
          {value}
        </div>
        <Icon size={32} opacity={0.3} className={colorClass} style={{ filter: `drop-shadow(0 0 10px ${glowColorClass})` }} />
      </div>
      {subtitle && <div className="text-muted text-xs mt-2">{subtitle}</div>}
    </div>
  )
}

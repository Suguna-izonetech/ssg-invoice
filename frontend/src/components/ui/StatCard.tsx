import { clsx } from 'clsx'
import { TrendingUp } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  color: 'blue' | 'green' | 'purple' | 'orange' | 'cyan' | 'rose' | 'teal'
  subtitle?: string
}

const colorMap = {
  blue:   { bg: 'bg-blue-500/10',   icon: 'text-blue-400',   border: 'border-blue-500/20' },
  green:  { bg: 'bg-emerald-500/10', icon: 'text-emerald-400', border: 'border-emerald-500/20' },
  purple: { bg: 'bg-purple-500/10', icon: 'text-purple-400', border: 'border-purple-500/20' },
  orange: { bg: 'bg-orange-500/10', icon: 'text-orange-400', border: 'border-orange-500/20' },
  cyan:   { bg: 'bg-cyan-500/10',   icon: 'text-cyan-400',   border: 'border-cyan-500/20' },
  rose:   { bg: 'bg-rose-500/10',   icon: 'text-rose-400',   border: 'border-rose-500/20' },
  teal:   { bg: 'bg-teal-500/10',   icon: 'text-teal-400',   border: 'border-teal-500/20' },
}

export default function StatCard({ title, value, icon, color, subtitle }: StatCardProps) {
  const c = colorMap[color]
  return (
    <div className="card hover:border-slate-700 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-slate-400 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        </div>
        <div className={clsx('w-11 h-11 rounded-xl flex items-center justify-center border flex-shrink-0', c.bg, c.border)}>
          <span className={c.icon}>{icon}</span>
        </div>
      </div>
    </div>
  )
}

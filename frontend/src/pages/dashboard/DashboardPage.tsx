import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText, Calendar, CalendarDays, CalendarRange,
  IndianRupee, TrendingUp, CheckCircle2, Clock, Hash
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { dashboardService } from '../../services/dashboardService'
import { useAuth } from '../../contexts/AuthContext'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { format, parseISO } from 'date-fns'

const fmt = (v: string | number) =>
  '₹' + Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })

const PIE_COLORS = ['#3b82f6','#6366f1','#8b5cf6','#a855f7','#ec4899','#f43f5e','#f97316','#eab308','#22c55e','#14b8a6']

function StatCard({ label, value, sub, icon: Icon, color }: any) {
  return (
    <div className="card flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-slate-400 text-sm">{label}</p>
        <p className="text-2xl font-bold text-white mt-0.5">{value}</p>
        {sub && <p className="text-slate-500 text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function InvoiceRow({ inv }: { inv: any }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-800 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-200 truncate">{inv.invoice_number}</p>
        <p className="text-xs text-slate-500 mt-0.5">
          {inv.bank_name} · {format(parseISO(inv.invoice_date), 'dd MMM yyyy')}
        </p>
      </div>
      <div className="text-right ml-4 flex-shrink-0">
        <p className="text-sm font-semibold text-blue-400">{fmt(inv.loan_requested_amount)}</p>
        {inv.loan_sanctioned_amount && (
          <p className="text-xs text-emerald-400 mt-0.5">{fmt(inv.loan_sanctioned_amount)}</p>
        )}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { isBackendAvailable, revalidate } = useAuth()

  useEffect(() => {
    if (!isBackendAvailable) {
      navigate('/login', { replace: true })
    }
  }, [isBackendAvailable, navigate])

  if (!isBackendAvailable) {
    return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>
  }

  const { data: stats, isLoading: statsLoading, isError: statsError } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardService.getStats,
    refetchInterval: 30000,
    retry: 1,
  })
  const { data: monthly = [], isError: monthlyError } = useQuery({
    queryKey: ['monthly-trends'],
    queryFn: dashboardService.getMonthlyTrends,
    retry: 1,
  })
  const { data: weekly = [], isError: weeklyError } = useQuery({
    queryKey: ['weekly-trends'],
    queryFn: dashboardService.getWeeklyTrends,
    retry: 1,
  })
  const { data: bankDist = [], isError: bankError } = useQuery({
    queryKey: ['bank-dist'],
    queryFn: dashboardService.getBankDistribution,
    retry: 1,
  })
  const { data: loanComp = [], isError: loanError } = useQuery({
    queryKey: ['loan-comp'],
    queryFn: dashboardService.getLoanComparison,
    retry: 1,
  })
  const { data: recent = [], isError: recentError } = useQuery({
    queryKey: ['recent-invoices'],
    queryFn: dashboardService.getRecentInvoices,
    retry: 1,
  })
  const { data: upcomingNumber, isError: upcomingError } = useQuery({
    queryKey: ['upcoming-invoice-number'],
    queryFn: dashboardService.getUpcomingInvoiceNumber,
    retry: 1,
    refetchInterval: 30000,
  })

  const hasQueryErrors = statsError || monthlyError || weeklyError || bankError || loanError || recentError || upcomingError
  if (hasQueryErrors) {
    revalidate()
  }

  if (statsLoading) return (
    <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>
  )

  const monthlyChartData = monthly.map(m => ({
    month: m.month, count: m.count, amount: Number(m.total_amount) / 100000,
  }))
  const weeklyChartData = weekly.map(w => ({
    week: w.week.replace('Week ', 'W'), count: w.count, amount: Number(w.total_amount) / 100000,
  }))
  const loanChartData = loanComp.map(l => ({
    month: l.month,
    Requested: Number(l.loan_requested) / 100000,
    Sanctioned: Number(l.loan_sanctioned) / 100000,
  }))

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Overview of your invoice management system</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Invoices" value={stats?.total_invoices ?? 0} icon={FileText} color="bg-blue-600" />
        <StatCard label="Today's Invoices" value={stats?.today_invoices ?? 0} icon={Calendar} color="bg-indigo-600" />
        <StatCard label="Weekly Invoices" value={stats?.weekly_invoices ?? 0} icon={CalendarDays} color="bg-violet-600" />
        <StatCard label="Monthly Invoices" value={stats?.monthly_invoices ?? 0} icon={CalendarRange} color="bg-purple-600" />
        <StatCard label="Total Invoice Amount" value={fmt(stats?.total_loan_requested ?? 0)} icon={IndianRupee} color="bg-rose-600" sub="Cumulative requested" />
        <StatCard label="Total Loan Sanctioned" value={fmt(stats?.total_loan_sanctioned ?? 0)} icon={CheckCircle2} color="bg-emerald-600" sub="Cumulative sanctioned" />
        <StatCard label="Total Invoice Amount" value={fmt(stats?.total_invoice_amount ?? 0)} icon={TrendingUp} color="bg-amber-600" sub="All time" />
        <StatCard label="Previous Invoices" value={Math.max(0,(stats?.total_invoices ?? 0) - (stats?.monthly_invoices ?? 0))} icon={Clock} color="bg-slate-600" sub="Before this month" />
      </div>

      {/* Section 1: Recent Invoices + Upcoming Invoice Number */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <div className="card">
          <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <Clock size={16} className="text-blue-400" /> Recent Invoices
          </h2>
          {recent.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No invoices yet</p>
          ) : (
            <div className="overflow-y-auto max-h-72 pr-1">
              {recent.map(inv => <InvoiceRow key={inv.id} inv={inv} />)}
            </div>
          )}
        </div>

        {/* Upcoming Invoice Number */}
        <div className="card">
          <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <Hash size={16} className="text-purple-400" /> Upcoming Invoice Number
          </h2>
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <div className="w-16 h-16 bg-purple-600/20 border border-purple-500/30 rounded-2xl flex items-center justify-center">
              <Hash className="w-8 h-8 text-purple-400" />
            </div>
            {upcomingNumber ? (
              <>
                <div className="text-center">
                  <p className="text-xs text-slate-500 mb-2">Next invoice will be generated as</p>
                  <p className="text-2xl font-bold text-white font-mono tracking-wider">
                    {upcomingNumber.next_invoice_number}
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
                    Financial Year: <span className="text-slate-300">{upcomingNumber.financial_year}</span>
                    {' · '}
                    Serial: <span className="text-slate-300">#{upcomingNumber.next_serial}</span>
                  </p>
                </div>
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2 text-center">
                  <p className="text-xs text-slate-400">
                    This number is reserved for the <strong className="text-slate-200">next new invoice</strong> you create
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center">
                <p className="text-slate-500 text-sm">Loading next invoice number...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section 2: Monthly + Weekly Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Monthly Invoice Trends</h2>
          {monthlyChartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-500 text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlyChartData}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} labelStyle={{ color: '#94a3b8' }} itemStyle={{ color: '#cbd5e1' }} />
                <Area type="monotone" dataKey="count" name="Invoices" stroke="#3b82f6" fill="url(#areaGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Weekly Invoice Trends</h2>
          {weeklyChartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-500 text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weeklyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="week" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} labelStyle={{ color: '#94a3b8' }} itemStyle={{ color: '#cbd5e1' }} />
                <Bar dataKey="count" name="Invoices" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Bank Distribution + Loan Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-sm font-semibold text-slate-300 mb-2">Bank-wise Distribution</h2>
          <p className="text-xs text-slate-500 mb-4">Showing the updated approved bank list distribution.</p>
          {bankDist.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-500 text-sm">No data yet</div>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="60%" height={200}>
                <PieChart>
                  <Pie data={bankDist} dataKey="count" nameKey="bank_name" cx="50%" cy="50%" outerRadius={80} stroke="none">
                    {bankDist.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} itemStyle={{ color: '#cbd5e1' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5">
                {bankDist.map((b, i) => (
                  <div key={b.bank_name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-xs text-slate-400 flex-1">{b.bank_name}</span>
                    <span className="text-xs font-medium text-slate-300">{b.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Invoice Amount vs Sanctioned (₹ Lakhs)</h2>
          {loanChartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-500 text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={loanChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} labelStyle={{ color: '#94a3b8' }} itemStyle={{ color: '#cbd5e1' }} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#64748b' }} />
                <Bar dataKey="Requested" fill="#f43f5e" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Sanctioned" fill="#22c55e" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}

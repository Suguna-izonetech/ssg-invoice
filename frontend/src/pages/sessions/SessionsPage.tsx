import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Monitor, Smartphone, Globe, Trash2, Clock, Calendar } from 'lucide-react'
import api from '../../services/api'
import type { Session } from '../../types'
import { format, parseISO, formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

function DeviceIcon({ info }: { info: string | null }) {
  if (!info) return <Monitor size={18} />
  const lower = info.toLowerCase()
  if (lower.includes('mobile') || lower.includes('android') || lower.includes('iphone')) return <Smartphone size={18} />
  return <Monitor size={18} />
}

function parseDeviceInfo(raw: string | null) {
  if (!raw) return { browser: 'Unknown', os: 'Unknown', screen: 'Unknown' }
  try {
    const d = JSON.parse(raw)
    const ua = d.userAgent || ''
    let browser = 'Unknown'
    if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome'
    else if (ua.includes('Firefox')) browser = 'Firefox'
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari'
    else if (ua.includes('Edg')) browser = 'Edge'
    let os = 'Unknown'
    if (ua.includes('Windows')) os = 'Windows'
    else if (ua.includes('Mac')) os = 'macOS'
    else if (ua.includes('Linux')) os = 'Linux'
    else if (ua.includes('Android')) os = 'Android'
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS'
    return { browser, os, screen: d.screen || 'Unknown', timezone: d.timezone }
  } catch { return { browser: 'Unknown', os: 'Unknown', screen: 'Unknown' } }
}

export default function SessionsPage() {
  const qc = useQueryClient()

  const { data: sessions = [], isLoading } = useQuery<Session[]>({
    queryKey: ['sessions'],
    queryFn: async () => { const { data } = await api.get('/sessions'); return data },
    refetchInterval: 15000,
  })

  const revokeMut = useMutation({
    mutationFn: (id: string) => api.delete(`/sessions/${id}`),
    onSuccess: () => { toast.success('Session revoked'); qc.invalidateQueries({ queryKey: ['sessions'] }) },
    onError: () => toast.error('Failed to revoke session'),
  })

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Active Devices</h1>
        <p className="text-slate-400 text-sm mt-1">Manage your active login sessions (max 2 devices)</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card text-center">
          <p className="text-3xl font-bold text-white">{sessions.length}</p>
          <p className="text-slate-400 text-sm mt-1">Active Sessions</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-white">2</p>
          <p className="text-slate-400 text-sm mt-1">Maximum Allowed</p>
        </div>
      </div>

      {/* Device capacity bar */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-400">Device capacity</span>
          <span className="text-sm font-medium text-white">{sessions.length} / 2</span>
        </div>
        <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${sessions.length >= 2 ? 'bg-red-500' : sessions.length === 1 ? 'bg-amber-500' : 'bg-blue-500'}`}
            style={{ width: `${(sessions.length / 2) * 100}%` }}
          />
        </div>
        {sessions.length >= 2 && (
          <p className="text-amber-400 text-xs mt-2">⚠ Maximum device limit reached. New logins from other devices will be blocked.</p>
        )}
      </div>

      {/* Sessions list */}
      {isLoading ? (
        <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
      ) : sessions.length === 0 ? (
        <div className="card text-center py-12">
          <Monitor className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No active sessions</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session, idx) => {
            const device = parseDeviceInfo(session.device_info)
            return (
              <div key={session.id} className="card">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0 text-blue-400">
                      <DeviceIcon info={session.device_info} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-white">{device.browser} on {device.os}</p>
                        {idx === 0 && (
                          <span className="badge bg-blue-500/15 text-blue-400 border border-blue-500/30">Current</span>
                        )}
                        <span className="badge bg-emerald-500/15 text-emerald-400">Active</span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                        <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                          <Globe size={12} />
                          <span>{session.ip_address || 'Unknown IP'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                          <Calendar size={12} />
                          <span>Logged in {format(parseISO(session.login_at), 'dd MMM yyyy, HH:mm')}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                          <Clock size={12} />
                          <span>Last active {formatDistanceToNow(parseISO(session.last_activity_at), { addSuffix: true })}</span>
                        </div>
                      </div>
                      {device.screen !== 'Unknown' && (
                        <p className="text-slate-600 text-xs mt-1">Screen: {device.screen}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => revokeMut.mutate(session.id)}
                    disabled={revokeMut.isPending}
                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors flex-shrink-0"
                    title="Revoke session"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

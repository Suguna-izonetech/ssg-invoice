import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard, FileText, Monitor, LogOut, Menu, X, Receipt, UserCircle
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { profileService } from '../../services/profileService'
import toast from 'react-hot-toast'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/invoices', icon: FileText, label: 'Invoices' },
  { to: '/sessions', icon: Monitor, label: 'Active Devices' },
  { to: '/profile', icon: UserCircle, label: 'Profile' },
]

export default function AppLayout() {
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [photoTimestamp, setPhotoTimestamp] = useState(Date.now())

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: profileService.getProfile,
    staleTime: 60000,
  })

  const handleLogout = async () => {
    try {
      await logout()
      toast.success('Logged out successfully')
    } catch {
      toast.error('Logout failed')
    }
  }

  const photoUrl = profile?.has_profile_photo
    ? `${profileService.getPhotoUrl()}?t=${photoTimestamp}`
    : null

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
        <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
          <Receipt className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-white text-sm leading-tight">SSG Invoice</p>
          <p className="text-slate-500 text-xs">Management System</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              }`
            }
          >
            <Icon className="w-4.5 h-4.5 flex-shrink-0" size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-slate-800">
        <NavLink
          to="/profile"
          onClick={() => setSidebarOpen(false)}
          className="flex items-center gap-3 px-3 py-2 mb-2 rounded-lg hover:bg-slate-800 transition-all group"
        >
          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
            {photoUrl ? (
              <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                <span className="text-blue-400 text-xs font-bold uppercase">
                  {profile?.username?.[0] ?? user?.username?.[0]}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">{profile?.username ?? user?.username}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
        </NavLink>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-red-900/30 hover:text-red-400 transition-all"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900 border-r border-slate-800 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="relative flex flex-col w-64 bg-slate-900 border-r border-slate-800">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-slate-900 border-b border-slate-800">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-400 hover:text-white">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-blue-400" />
            <span className="font-semibold text-white text-sm">SSG Invoice</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

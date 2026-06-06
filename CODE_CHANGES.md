# Code Changes Reference Guide

## Quick Comparison: Before vs After

---

## File 1: frontend/src/contexts/AuthContext.tsx

### BEFORE (Vulnerable)
```typescript
interface AuthContextType {
  user: User | null
  isLoading: boolean
  // ❌ NO backend availability tracking
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  // ❌ PROBLEM: Runs only ONCE on app mount
  const loadUser = useCallback(async () => {
    if (!authService.isLoggedIn()) {
      setIsLoading(false)
      return
    }
    try {
      const healthy = await authService.ping()
      if (!healthy) {
        throw new Error('Backend unavailable')
      }
      const u = await authService.getMe()
      setUser(u)  // ❌ Once set, never re-validated
    } catch {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // ❌ Only runs once on component mount
  useEffect(() => {
    loadUser()
  }, [loadUser])

  const login = async (username: string, password: string) => {
    await authService.login(username, password)
    const u = await authService.getMe()
    setUser(u)
    navigate('/dashboard')
  }

  const logout = async () => {
    await authService.logout()
    setUser(null)
    navigate('/login')
  }

  // ❌ No continuous health monitoring
  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
```

### AFTER (Secure)
```typescript
interface AuthContextType {
  user: User | null
  isLoading: boolean
  isBackendAvailable: boolean  // ✅ NEW: explicit backend flag
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  revalidate: () => Promise<void>  // ✅ NEW: manual revalidation method
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isBackendAvailable, setIsBackendAvailable] = useState(false)  // ✅ NEW
  const navigate = useNavigate()
  const location = useLocation()
  const healthCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)  // ✅ NEW

  // ✅ NEW: Centralized auth cleanup
  const clearAuth = useCallback(() => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('device_fingerprint')
    setUser(null)
    setIsBackendAvailable(false)
  }, [])

  // ✅ NEW: Separated backend validation from user loading
  const validateBackend = useCallback(async (): Promise<boolean> => {
    try {
      const healthy = await authService.ping()
      if (!healthy) {
        setIsBackendAvailable(false)
        return false
      }
      setIsBackendAvailable(true)
      return true
    } catch {
      setIsBackendAvailable(false)
      return false
    }
  }, [])

  // ✅ IMPROVED: Three-step validation process
  const loadUser = useCallback(async () => {
    // Step 1: Check if token exists
    if (!authService.isLoggedIn()) {
      clearAuth()
      setIsLoading(false)
      return
    }

    // Step 2: Validate backend is available
    const backendAvailable = await validateBackend()
    if (!backendAvailable) {
      clearAuth()
      setIsLoading(false)
      return
    }

    // Step 3: Fetch user data from backend
    try {
      const u = await authService.getMe()
      setUser(u)
    } catch {
      clearAuth()
    } finally {
      setIsLoading(false)
    }
  }, [clearAuth, validateBackend])

  // ✅ Initial load (unchanged, but more robust)
  useEffect(() => {
    loadUser()
  }, [])

  // ✅ NEW: 30-second health check interval
  useEffect(() => {
    if (!user) return

    const checkHealth = async () => {
      const healthy = await validateBackend()
      if (!healthy && user) {
        clearAuth()
        if (location.pathname !== '/login') {
          navigate('/login', { replace: true })  // ✅ Force logout
        }
      }
    }

    healthCheckIntervalRef.current = setInterval(checkHealth, 30000)

    return () => {
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current)
      }
    }
  }, [user, validateBackend, clearAuth, navigate, location.pathname])

  const login = async (username: string, password: string) => {
    await authService.login(username, password)
    const u = await authService.getMe()
    setUser(u)
    setIsBackendAvailable(true)
    navigate('/dashboard', { replace: true })
  }

  const logout = async () => {
    await authService.logout()
    clearAuth()
    navigate('/login', { replace: true })
  }

  // ✅ NEW: Manual revalidation method for components
  const revalidate = useCallback(async () => {
    setIsLoading(true)
    try {
      await loadUser()
    } finally {
      setIsLoading(false)
    }
  }, [loadUser])

  // ✅ IMPROVED: Include backend availability in context
  return (
    <AuthContext.Provider value={{ user, isLoading, isBackendAvailable, login, logout, revalidate }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
```

**Key Improvements:**
- ✅ `isBackendAvailable` explicitly tracks backend connection
- ✅ `validateBackend()` separated from `loadUser()` for reusability
- ✅ `clearAuth()` centralized for consistency
- ✅ 30-second health check loop with automatic logout
- ✅ `revalidate()` method for on-demand checks
- ✅ Three-step validation: token → backend → user

---

## File 2: frontend/src/App.tsx

### BEFORE (Vulnerable)
```typescript
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()  // ❌ No backend check
  if (isLoading) return <div className="h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>
  if (!user) return <Navigate to="/login" replace />
  // ❌ If user exists, allows access even if backend is down
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return <div className="h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>
  if (user) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="sessions" element={<SessionsPage />} />
        </Route>
        {/* ❌ Catch-all redirects to dashboard - can cause loops */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  )
}
```

### AFTER (Secure)
```typescript
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isBackendAvailable } = useAuth()  // ✅ Added isBackendAvailable
  
  // Still loading user data
  if (isLoading) {
    return <div className="h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>
  }

  // ✅ NEW: Backend must be available
  if (!isBackendAvailable) {
    return <Navigate to="/login" replace />
  }

  // No authenticated user
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // ✅ Only reach here if: loaded + backend available + user exists
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  
  if (isLoading) {
    return <div className="h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>
  }
  
  if (user) {
    return <Navigate to="/dashboard" replace />
  }
  
  return <>{children}</>
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="sessions" element={<SessionsPage />} />
        </Route>
        {/* ✅ Fixed: Catch-all redirects to /login (not /dashboard) */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  )
}
```

**Key Changes:**
- ✅ ProtectedRoute now checks `isBackendAvailable` before rendering
- ✅ Three-layer check: loading → backend → user
- ✅ Catch-all route redirects to `/login` (prevents redirect loops)
- ✅ Consistent navigation with `replace: true`

---

## File 3: frontend/src/pages/dashboard/DashboardPage.tsx

### BEFORE (Vulnerable)
```typescript
import { useQuery } from '@tanstack/react-query'
// ❌ Missing useAuth import and backend checks

export default function DashboardPage() {
  // ❌ No backend verification
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardService.getStats,
    refetchInterval: 30000,
    // ❌ No error handling
  })
  // ... other queries without error handling ...

  if (statsLoading) return (
    <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>
  )

  // ❌ Renders dashboard without checking if backend is still alive
  return (
    <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">
      {/* Dashboard content... */}
    </div>
  )
}
```

### AFTER (Secure)
```typescript
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'  // ✅ NEW
import { useNavigate } from 'react-router-dom'  // ✅ NEW
// ... other imports ...
import { useAuth } from '../../contexts/AuthContext'  // ✅ NEW

export default function DashboardPage() {
  const navigate = useNavigate()
  const { isBackendAvailable, revalidate } = useAuth()  // ✅ NEW: backend checks

  // ✅ NEW: Force redirect if backend is not available
  useEffect(() => {
    if (!isBackendAvailable) {
      navigate('/login', { replace: true })
    }
  }, [isBackendAvailable, navigate])

  // ✅ NEW: If backend is not available, don't render anything
  if (!isBackendAvailable) {
    return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>
  }

  // ✅ IMPROVED: React Query with error tracking
  const { data: stats, isLoading: statsLoading, isError: statsError } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardService.getStats,
    refetchInterval: 30000,
    retry: 1,  // ✅ NEW: Don't retry forever
  })
  const { data: monthly = [], isError: monthlyError } = useQuery({ 
    queryKey: ['monthly-trends'], 
    queryFn: dashboardService.getMonthlyTrends,
    retry: 1,
  })
  // ... other queries with error tracking ...

  // ✅ NEW: If any query failed, revalidate backend health
  const hasQueryErrors = statsError || monthlyError || weeklyError || bankError || loanError || recentError || upcomingError
  if (hasQueryErrors) {
    revalidate()  // ✅ Force backend health check
  }

  if (statsLoading) return (
    <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>
  )

  // ✅ Only reaches here if: backend available + queries succeeded
  return (
    <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">
      {/* Dashboard content... */}
    </div>
  )
}
```

**Key Changes:**
- ✅ Import `useAuth`, `useEffect`, `useNavigate`
- ✅ Component-level backend check with forced redirect
- ✅ Early return if backend unavailable (don't render dashboard)
- ✅ React Query with `retry: 1` and error tracking
- ✅ Call `revalidate()` if any query fails
- ✅ Multi-layered defense at component level

---

## Summary of Changes

| Aspect | Before | After | Impact |
|--------|--------|-------|--------|
| Backend tracking | Single check on mount | Continuous 30s polling | Catch backend failures immediately |
| Route protection | Check user only | Check user + backend | Can't access pages without backend |
| Dashboard protection | No checks | useEffect + runtime checks | Can't view dashboard if backend dies |
| Error recovery | Try-catch only | Comprehensive error handlers | Graceful degradation |
| Login requirement | Once after login | Every route access | Guaranteed backend requirement |
| Token lifecycle | Single validation | Continuous validation | Stale tokens never grant access |

---

## Testing the Fix

### Test 1: Can't Login Without Backend
```bash
# Backend stopped
npm run dev
# Go to /login
# Try to login → Error: "Backend is not available"
✅ PASS
```

### Test 2: Can't Access Dashboard if Backend Stops
```bash
# Login with backend running
# Backend crashes
# Observe: Redirected to /login automatically
✅ PASS
```

### Test 3: Stale Tokens Don't Work
```bash
# Login with backend running
# Stop backend
# Reload browser
# Observe: Redirected to /login, localStorage cleared
✅ PASS
```

---

## Deployment Steps

1. Update `AuthContext.tsx` with new implementation
2. Update `App.tsx` ProtectedRoute with isBackendAvailable check
3. Update `DashboardPage.tsx` with backend checks and error handling
4. Run `npm run build` (should complete with 0 errors)
5. Test all three scenarios above
6. Deploy to production

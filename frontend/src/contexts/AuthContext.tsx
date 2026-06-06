import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import type { User } from '../types'
import { authService } from '../services/authService'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isBackendAvailable: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  revalidate: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isBackendAvailable, setIsBackendAvailable] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const healthCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearAuth = useCallback(() => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('device_fingerprint')
    setUser(null)
    setIsBackendAvailable(false)
  }, [])

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
      // Backend was available but getMe failed - invalid token or expired
      clearAuth()
    } finally {
      setIsLoading(false)
    }
  }, [clearAuth, validateBackend])

  // Initial load on app mount
  useEffect(() => {
    loadUser()
  }, [])

  // Health check interval - verify backend every 30 seconds
  useEffect(() => {
    if (!user) return

    const checkHealth = async () => {
      const healthy = await validateBackend()
      if (!healthy && user) {
        // Backend went down, clear auth
        clearAuth()
        if (location.pathname !== '/login') {
          navigate('/login', { replace: true })
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
    // Login itself validates backend first
    await authService.login(username, password)
    // If login succeeds, verify user data
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

  const revalidate = useCallback(async () => {
    setIsLoading(true)
    try {
      await loadUser()
    } finally {
      setIsLoading(false)
    }
  }, [loadUser])

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

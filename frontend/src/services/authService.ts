import api from './api'
import type { TokenResponse, User } from '../types'

function getDeviceFingerprint(): string {
  const stored = localStorage.getItem('device_fingerprint')
  if (stored) return stored

  const fp = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    navigator.platform,
  ].join('|')

  const hash = btoa(fp).slice(0, 64)
  localStorage.setItem('device_fingerprint', hash)
  return hash
}

function getDeviceInfo(): string {
  return JSON.stringify({
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    screen: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  })
}

export const authService = {
  async login(username: string, password: string): Promise<TokenResponse> {
    const healthy = await this.ping()
    if (!healthy) {
      throw new Error('Backend is not available. Start the backend to login.')
    }

    try {
      const { data } = await api.post<TokenResponse>('/auth/login', {
        username,
        password,
        device_fingerprint: getDeviceFingerprint(),
        device_info: getDeviceInfo(),
      })

      if (!data?.access_token) {
        throw new Error('Invalid login response')
      }

      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token)
      return data
    } catch (error) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      throw error
    }
  },

  async ping(): Promise<boolean> {
    try {
      const response = await api.get('/health')
      return response.status >= 200 && response.status < 300
    } catch {
      return false
    }
  },

  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem('refresh_token')
    if (refreshToken) {
      try {
        await api.post('/auth/logout', { refresh_token: refreshToken })
      } catch {}
    }
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  },

  async getMe(): Promise<User> {
    const { data } = await api.get<User>('/auth/me')
    return data
  },

  getDeviceFingerprint,
  isLoggedIn: () => !!localStorage.getItem('access_token'),
}

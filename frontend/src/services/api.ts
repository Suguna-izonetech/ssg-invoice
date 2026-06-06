import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor - attach access token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Response interceptor - handle 401 and auto-refresh
let isRefreshing = false
let refreshSubscribers: ((token: string) => void)[] = []

function subscribeToRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb)
}

function notifyRefreshSubscribers(token: string) {
  refreshSubscribers.forEach((cb) => cb(token))
  refreshSubscribers = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeToRefresh((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            resolve(api(originalRequest))
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      const refreshToken = localStorage.getItem('refresh_token')
      const fingerprint = localStorage.getItem('device_fingerprint')

      if (!refreshToken || !fingerprint) {
        localStorage.clear()
        window.location.href = '/login'
        return Promise.reject(error)
      }

      try {
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, {
          refresh_token: refreshToken,
          device_fingerprint: fingerprint,
        })

        localStorage.setItem('access_token', data.access_token)
        localStorage.setItem('refresh_token', data.refresh_token)

        api.defaults.headers.common.Authorization = `Bearer ${data.access_token}`
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`

        notifyRefreshSubscribers(data.access_token)
        isRefreshing = false

        return api(originalRequest)
      } catch {
        isRefreshing = false
        localStorage.clear()
        window.location.href = '/login'
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  }
)

export default api

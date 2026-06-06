import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Receipt, Lock, User } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { authService } from '../../services/authService'
import toast from 'react-hot-toast'

const schema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const { login } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [backendAvailable, setBackendAvailable] = useState<boolean | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    let active = true

    const checkBackend = async () => {
      try {
        const healthy = await authService.ping()
        if (active) setBackendAvailable(healthy)
      } catch {
        if (active) setBackendAvailable(false)
      }
    }

    checkBackend()

    return () => {
      active = false
    }
  }, [])

  const onSubmit = async (data: FormData) => {
    setIsLoading(true)
    try {
      await login(data.username, data.password)
      toast.success('Welcome back!')
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Login failed'
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
      </div>
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-600/25">
            <Receipt className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">SSG Invoice System</h1>
          <p className="text-slate-400 mt-1 text-sm">Sign in to your account</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="label">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input {...register('username')} type="text" autoComplete="username" placeholder="Enter your username" className="input pl-10" />
              </div>
              {errors.username && <p className="text-red-400 text-xs mt-1">{errors.username.message}</p>}
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input {...register('password')} type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" className="input pl-10 pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>
            <button
              type="submit"
              disabled={isLoading || backendAvailable === false}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 mt-2"
            >
              {isLoading && <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
            {backendAvailable === false && (
              <p className="text-red-400 text-sm mt-3">
                Backend is not available. Start the backend to login.
              </p>
            )}
          </form>
        </div>
        <p className="text-center text-slate-600 text-xs mt-6">SSG Invoice Management System &copy; {new Date().getFullYear()}</p>
      </div>
    </div>
  )
}

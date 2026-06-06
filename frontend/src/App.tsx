import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoginPage from './pages/auth/LoginPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import InvoicesPage from './pages/invoices/InvoicesPage'
import SessionsPage from './pages/sessions/SessionsPage'
import AppLayout from './components/layout/AppLayout'
import LoadingSpinner from './components/ui/LoadingSpinner'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isBackendAvailable } = useAuth()
  
  // Still loading user data
  if (isLoading) {
    return <div className="h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>
  }

  // Backend is not available - cannot access protected routes
  if (!isBackendAvailable) {
    return <Navigate to="/login" replace />
  }

  // No authenticated user
  if (!user) {
    return <Navigate to="/login" replace />
  }

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
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  )
}

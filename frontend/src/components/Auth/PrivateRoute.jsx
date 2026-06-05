/**
 * Protection des routes authentifiées
 *
 * Usage :
 *   <Route element={<PrivateRoute />}>
 *     <Route path="/dashboard" element={<DashboardPage />} />
 *   </Route>
 *
 *   <Route element={<PrivateRoute adminOnly />}>
 *     <Route path="/utilisateurs" element={...} />
 *   </Route>
 */
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

function AuthSplash() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0D0D0D] text-[#00FFD1] font-mono tracking-widest">
      <span className="px-6 py-4 border border-[#00FFD1]">VÉRIFICATION AUTHENTIFICATION...</span>
    </div>
  )
}

export default function PrivateRoute({ adminOnly = false }) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth()

  if (isLoading) {
    return <AuthSplash />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

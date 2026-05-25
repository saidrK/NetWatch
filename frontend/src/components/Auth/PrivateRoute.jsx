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

export default function PrivateRoute({ adminOnly = false }) {
  const { isAuthenticated, isAdmin } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

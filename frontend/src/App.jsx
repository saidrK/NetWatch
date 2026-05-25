/**
 * Routes principales — auth + layout Mantine + pages BF
 */
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { useAuth } from '@/hooks/useAuth'
import PrivateRoute from '@/components/Auth/PrivateRoute'
import AppLayout from '@/components/layout/AppLayout'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import AlertesPage from '@/pages/AlertesPage'
import AnomaliesPage from '@/pages/AnomaliesPage'
import InventairePage from '@/pages/InventairePage'
import RapportsPage from '@/pages/RapportsPage'

function PublicOnlyRoute({ children }) {
  const { isAuthenticated } = useAuth()
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />

      <Route element={<PrivateRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/alertes" element={<AlertesPage />} />
          <Route path="/anomalies" element={<AnomaliesPage />} />
          <Route path="/inventaire" element={<InventairePage />} />
          <Route path="/rapports" element={<RapportsPage />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

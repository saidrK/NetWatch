import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { ToastProvider } from '@/context/ToastContext'
import { useAuth } from '@/hooks/useAuth'
import PrivateRoute from '@/components/Auth/PrivateRoute'
import AppLayout from '@/components/layout/AppLayout'
import SkeletonLoader from '@/components/ui/SkeletonLoader'

// Lazy loading for code splitting
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const AlertesPage = lazy(() => import('@/pages/AlertesPage'))
const AnomaliesPage = lazy(() => import('@/pages/AnomaliesPage'))
const InventairePage = lazy(() => import('@/pages/InventairePage'))
const RapportsPage = lazy(() => import('@/pages/RapportsPage'))
const UtilisateursPage = lazy(() => import('@/pages/UtilisateursPage'))
const ProfilPage = lazy(() => import('@/pages/ProfilPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))
const DetailEquipement = lazy(() => import('@/components/Inventaire/DetailEquipement'))
const DetailAlerte = lazy(() => import('@/components/Alertes/DetailAlerte'))

function PublicOnlyRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D0D0D] text-[#00FFD1] font-mono tracking-widest">
        <span className="px-6 py-4 border border-[#00FFD1]">VÉRIFICATION AUTHENTIFICATION...</span>
      </div>
    )
  }
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }
  return children
}

function AppRoutes() {
  const { isAuthenticated } = useAuth()
  return (
    <Suspense fallback={<SkeletonLoader />}>
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
            <Route path="/alertes/:id" element={<DetailAlerte />} />
            <Route path="/anomalies" element={<AnomaliesPage />} />
            <Route path="/inventaire" element={<InventairePage />} />
            <Route path="/inventaire/:id" element={<DetailEquipement />} />
            <Route path="/rapports" element={<RapportsPage />} />
            <Route path="/utilisateurs" element={<UtilisateursPage />} />
            <Route path="/profil" element={<ProfilPage />} />
          </Route>
        </Route>

        <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}

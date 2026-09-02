import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './guards'
import { PageLoading } from '@/components/PageLoading'
import LoginPage from '@/pages/login'

const MainLayout = lazy(() =>
  import('@/layouts/MainLayout').then((m) => ({ default: m.MainLayout })),
)
const MainMenuPage = lazy(() => import('@/pages/menu'))
const HarnessManagementPage = lazy(() => import('@/pages/management/List'))
const HarnessLedgerPage = lazy(() => import('@/pages/ledger/List'))

function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoading />}>{children}</Suspense>
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <LazyPage>
              <MainLayout />
            </LazyPage>
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/menu" replace />} />
        <Route
          path="management/:projectId?"
          element={
            <LazyPage>
              <HarnessManagementPage />
            </LazyPage>
          }
        />
        <Route
          path="ledger/:projectId?"
          element={
            <LazyPage>
              <HarnessLedgerPage />
            </LazyPage>
          }
        />
        <Route
          path="menu"
          element={
            <LazyPage>
              <MainMenuPage />
            </LazyPage>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

import { lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute, PublicOnlyRoute } from '@/components/layout/RouteGuards'
import { isSupabaseConfigured } from '@/lib/supabase'
import ConfigMissingPage from '@/pages/ConfigMissingPage'

const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'))
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'))
const LibraryPage = lazy(() => import('@/pages/library/LibraryPage'))
const ShelvesPage = lazy(() => import('@/pages/shelves/ShelvesPage'))
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))

export default function App() {
  if (!isSupabaseConfigured) return <ConfigMissingPage />

  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      {/* The recovery link signs the user in temporarily, so this page is reachable either way. */}
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="library" element={<LibraryPage view="all" />} />
          <Route path="shelves" element={<ShelvesPage />} />
          <Route path="recent" element={<LibraryPage view="recent" />} />
          <Route path="reading" element={<LibraryPage view="reading" />} />
          <Route path="finished" element={<LibraryPage view="finished" />} />
          <Route path="favorites" element={<LibraryPage view="favorites" />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

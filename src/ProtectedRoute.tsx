import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

type ProtectedRouteProps = {
  children: React.ReactNode
  requireAdmin?: boolean
  redirectTo?: string
}

export default function ProtectedRoute({
  children,
  requireAdmin = false,
  redirectTo = '/',
}: ProtectedRouteProps) {
  const location = useLocation()
  const { ready, session, isAdmin, profileLoading } = useAuth()

  if (!ready) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-100 via-white to-pink-50/80 text-stone-900">
        <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-4">
          <div className="rounded-2xl border border-stone-200 bg-white px-5 py-4 text-sm text-stone-600 shadow-lg shadow-stone-200/50">
            확인 중...
          </div>
        </div>
      </div>
    )
  }

  if (!session?.user) {
    return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />
  }

  if (requireAdmin) {
    if (profileLoading) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-stone-100 via-white to-pink-50/80 text-stone-900">
          <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-4">
            <div className="rounded-2xl border border-stone-200 bg-white px-5 py-4 text-sm text-stone-600 shadow-lg shadow-stone-200/50">
              권한 확인 중...
            </div>
          </div>
        </div>
      )
    }
    if (!isAdmin) {
      return (
        <Navigate
          to="/dashboard"
          replace
          state={{ from: location.pathname, adminDenied: true }}
        />
      )
    }
  }

  return <>{children}</>
}

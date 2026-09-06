import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { ReactElement } from 'react'

import { useAuth } from '../features/auth/AuthContext'

export function ProtectedRoute(): ReactElement {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}

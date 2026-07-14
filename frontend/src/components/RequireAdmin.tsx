import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/auth'

/** Layout guard: admin-only. A direct URL hit by a member redirects home. */
export function RequireAdmin() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/" replace />
  return <Outlet />
}

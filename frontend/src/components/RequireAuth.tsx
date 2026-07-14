import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/auth'

/** Layout guard: renders nested routes only when authenticated. */
export function RequireAuth() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

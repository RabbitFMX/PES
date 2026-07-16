import { useAuth } from '../../context/auth'
import { MemberOverview } from '../../components/MemberOverview'

/** Přehled — the current member's personal detailed dashboard. */
export function DashboardPage() {
  const { user } = useAuth()
  if (!user) return null
  return <MemberOverview memberId={user.id} isSelf />
}

import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const links = [
  { to: '/', key: 'nav.dashboard' },
  { to: '/leaderboard', key: 'nav.leaderboard' },
  { to: '/challenges', key: 'nav.challenges' },
  { to: '/stats', key: 'nav.stats' },
] as const

export function NavBar() {
  const { t } = useTranslation()

  return (
    <nav className="flex gap-4 border-b border-secondary/20 bg-background p-4">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.to === '/'}
          className={({ isActive }) => (isActive ? 'font-semibold text-primary' : 'text-secondary')}
        >
          {t(link.key)}
        </NavLink>
      ))}
    </nav>
  )
}

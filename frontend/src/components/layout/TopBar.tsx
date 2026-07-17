import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/cn'
import { Logo } from '../Logo'
import { Button } from '../ui/Button'
import { ProfileMenu } from './ProfileMenu'
import { TestDataToggle } from '../TestDataToggle'

const links = [
  { to: '/', key: 'nav.dashboard', end: true },
  { to: '/leaderboard', key: 'nav.leaderboard', end: false },
  { to: '/challenges', key: 'nav.challenges', end: false },
  { to: '/stats', key: 'nav.stats', end: false },
  { to: '/rules', key: 'nav.rules', end: false },
]

export function TopBar({ onLogActivity }: { onLogActivity: () => void }) {
  const { t } = useTranslation()

  return (
    <header className="sticky top-0 z-20 hidden border-b border-border bg-surface/95 backdrop-blur lg:block">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-6">
        <NavLink to="/" className="flex items-center gap-2 text-primary" aria-label="PES">
          <Logo />
          <span className="text-lg font-bold tracking-tight">PES</span>
        </NavLink>
        <nav className="flex items-center gap-1" aria-label={t('nav.primary')}>
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                cn(
                  'rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'text-primary' : 'text-secondary hover:bg-secondary/10',
                )
              }
            >
              {t(link.key)}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <TestDataToggle />
          <Button onClick={onLogActivity} leftIcon={<PlusIcon />}>
            {t('nav.logActivity')}
          </Button>
          <ProfileMenu />
        </div>
      </div>
    </header>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" d="M12 5v14M5 12h14" />
    </svg>
  )
}

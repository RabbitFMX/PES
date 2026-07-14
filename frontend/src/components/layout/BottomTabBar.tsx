import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/cn'

const tabs = [
  { to: '/', labelKey: 'nav.dashboard', end: true, icon: HomeIcon },
  { to: '/leaderboard', labelKey: 'nav.leaderboard', end: false, icon: TrophyIcon },
  { to: '/challenges', labelKey: 'nav.challenges', end: false, icon: FlagIcon },
  { to: '/stats', labelKey: 'nav.stats', end: false, icon: ChartIcon },
]

export function BottomTabBar({ onLogActivity }: { onLogActivity: () => void }) {
  const { t } = useTranslation()

  return (
    <nav
      aria-label={t('nav.primary')}
      className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-around border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      {tabs.slice(0, 2).map((tab) => (
        <TabLink key={tab.to} to={tab.to} end={tab.end} icon={tab.icon} label={t(tab.labelKey)} />
      ))}
      <button
        type="button"
        onClick={onLogActivity}
        aria-label={t('nav.logActivity')}
        className="-mt-6 flex size-14 items-center justify-center rounded-full bg-accent text-[var(--color-on-accent)] shadow-[var(--shadow-pop)]"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-7"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" d="M12 5v14M5 12h14" />
        </svg>
      </button>
      {tabs.slice(2).map((tab) => (
        <TabLink key={tab.to} to={tab.to} end={tab.end} icon={tab.icon} label={t(tab.labelKey)} />
      ))}
    </nav>
  )
}

function TabLink({
  to,
  end,
  label,
  icon: Icon,
}: {
  to: string
  end: boolean
  label: string
  icon: () => React.ReactElement
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex flex-1 flex-col items-center gap-1 py-2 text-xs',
          isActive ? 'text-primary' : 'text-muted',
        )
      }
    >
      <Icon />
      <span>{label}</span>
    </NavLink>
  )
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinejoin="round" d="M3 11l9-7 9 7M5 10v10h14V10" />
    </svg>
  )
}
function TrophyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 4h10v4a5 5 0 01-10 0V4zM7 6H4v2a3 3 0 003 3M17 6h3v2a3 3 0 01-3 3M9 20h6M12 15v5"
      />
    </svg>
  )
}
function FlagIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 21V4h13l-2 4 2 4H5" />
    </svg>
  )
}
function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  )
}

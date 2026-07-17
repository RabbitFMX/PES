import { useTranslation } from 'react-i18next'
import { cn } from '../lib/cn'
import { isTestDataEnabled, setTestDataEnabled } from '../lib/testData'

/**
 * Quick-access "test data" switch for the main bar — flips the per-browser
 * test-data flag and reloads so every screen refetches. When on it turns the
 * accent colour so it is obvious test data is showing. Mirrors the fuller
 * toggle in Profile → Settings.
 */
export function TestDataToggle({ className }: { className?: string }) {
  const { t } = useTranslation()
  const enabled = isTestDataEnabled()

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={t('settings.testData')}
      title={t('settings.testData')}
      onClick={() => {
        setTestDataEnabled(!enabled)
        // Reload so already-loaded screens refetch with/without generated data.
        window.location.reload()
      }}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium ring-1 transition-colors',
        enabled
          ? 'bg-accent text-[var(--color-on-accent)] ring-transparent'
          : 'text-secondary ring-border hover:bg-secondary/10',
        className,
      )}
    >
      <FlaskIcon />
      <span className="hidden sm:inline">{t('settings.testData')}</span>
    </button>
  )
}

function FlaskIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 3h6M10 3v6l-5 8a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 17l-5-8V3M7.5 14h9"
      />
    </svg>
  )
}

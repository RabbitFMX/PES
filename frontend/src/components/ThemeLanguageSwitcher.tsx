import { useTranslation } from 'react-i18next'
import { useTheme } from '../context/theme'
import { cn } from '../lib/cn'

/** Compact theme + language controls, usable logged-out and logged-in. */
export function ThemeLanguageSwitcher({ className }: { className?: string }) {
  const { theme, toggle } = useTheme()
  const { i18n, t } = useTranslation()
  const lang = i18n.language.startsWith('en') ? 'en' : 'cs'

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <button
        type="button"
        onClick={() => i18n.changeLanguage(lang === 'cs' ? 'en' : 'cs')}
        className="rounded-full px-2 py-1 text-xs font-semibold text-secondary hover:bg-secondary/10"
        aria-label={t('settings.language')}
      >
        {lang.toUpperCase()}
      </button>
      <button
        type="button"
        onClick={toggle}
        className="rounded-full p-2 text-secondary hover:bg-secondary/10"
        aria-label={t('settings.toggleTheme')}
      >
        {theme === 'dark' ? (
          <svg
            viewBox="0 0 24 24"
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="12" cy="12" r="4" />
            <path
              strokeLinecap="round"
              d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"
            />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"
            />
          </svg>
        )}
      </button>
    </div>
  )
}

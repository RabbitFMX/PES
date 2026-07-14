import { useTranslation } from 'react-i18next'

export function DashboardPage() {
  const { t } = useTranslation()

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold text-secondary">{t('nav.dashboard')}</h1>
      <p className="mt-2 text-text">{t('dashboard.welcome')}</p>
    </main>
  )
}

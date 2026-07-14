import { useTranslation } from 'react-i18next'

export function StatsPage() {
  const { t } = useTranslation()

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold text-secondary">{t('nav.stats')}</h1>
    </main>
  )
}

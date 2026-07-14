import { useTranslation } from 'react-i18next'

export function LeaderboardPage() {
  const { t } = useTranslation()

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold text-secondary">{t('nav.leaderboard')}</h1>
    </main>
  )
}

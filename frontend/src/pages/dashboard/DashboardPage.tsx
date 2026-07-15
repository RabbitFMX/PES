import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAsync } from '../../lib/useAsync'
import { getDashboard } from '../../lib/api'
import { formatPoints } from '../../lib/format'
import { useLogActivity } from '../../context/logActivity'
import type { DashboardData } from '../../lib/types'
import { ProgressRing } from '../../components/ui/ProgressRing'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button, ButtonLink } from '../../components/ui/Button'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/ErrorState'

export function DashboardPage() {
  const { t } = useTranslation()
  const { data, loading, error, reload } = useAsync<DashboardData>(getDashboard)
  const { open: openLog } = useLogActivity()

  if (loading) return <DashboardSkeleton />
  if (error || !data) return <ErrorState onRetry={reload} />

  const isNewMember = data.weeklyPoints === 0 && data.roundTotal === 0
  const goalMet = data.weeklyPoints >= data.weeklyGoal
  const remaining = Math.max(0, data.weeklyGoal - data.weeklyPoints)

  const nudge = isNewMember
    ? t('dashboard.welcome')
    : goalMet
      ? t('dashboard.goalReached')
      : t('dashboard.pointsToGoal', { points: formatPoints(remaining) })

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Hero: progress ring + nudge */}
      <Card className="flex flex-col items-center gap-4 py-8">
        <ProgressRing
          value={data.weeklyPoints}
          max={data.weeklyGoal}
          valueText={`${data.weeklyPoints} / ${data.weeklyGoal}`}
        >
          <span className="text-5xl font-bold text-text">{formatPoints(data.weeklyPoints)}</span>
          <span className="text-sm text-muted">/ {data.weeklyGoal}</span>
        </ProgressRing>
        <p className="flex items-center gap-2 text-center text-base font-medium text-text">
          {goalMet && !isNewMember && (
            <span className="animate-bounce" aria-hidden="true">
              🎉
            </span>
          )}
          {nudge}
        </p>
        <Button
          size="lg"
          onClick={openLog}
          className="hidden lg:inline-flex"
          leftIcon={<PlusIcon />}
        >
          {t('dashboard.logActivity')}
        </Button>
      </Card>

      {/* Stats + challenge */}
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3">
          <StatChip
            to="/stats"
            label={t('dashboard.roundTotal')}
            value={formatPoints(data.roundTotal)}
          />
          <StatChip
            to="/leaderboard"
            label={t('dashboard.rank')}
            value={t('dashboard.rankValue', { rank: data.packRank, size: data.packSize })}
          />
          <StatChip
            to="/stats"
            label={t('dashboard.streak')}
            value={t('dashboard.streakValue', { count: data.streakWeeks })}
          />
        </div>

        <ChallengeBanner challenge={data.currentChallenge} />
      </div>
    </div>
  )
}

function StatChip({ to, label, value }: { to: string; label: string; value: string }) {
  return (
    <Link to={to} className="block rounded-[var(--radius-md)]">
      <Card className="h-full text-center transition-colors hover:ring-primary">
        <div className="text-2xl font-bold text-text">{value}</div>
        <div className="mt-1 text-xs text-muted">{label}</div>
      </Card>
    </Link>
  )
}

function ChallengeBanner({ challenge }: { challenge: DashboardData['currentChallenge'] }) {
  const { t } = useTranslation()
  return (
    <Card className="flex items-center justify-between gap-4 bg-primary/5">
      <div>
        <div className="text-xs font-semibold tracking-wide text-primary uppercase">
          {t('dashboard.challengeThisWeek')}
        </div>
        <div className="mt-1 font-semibold text-text">
          {challenge ? challenge.title : t('challenges.empty')}
        </div>
        {challenge?.hasSubmitted && (
          <Badge variant="success" className="mt-2">
            {t('challenges.submitted')}
          </Badge>
        )}
      </div>
      <ButtonLink variant="secondary" to="/challenges">
        {t('dashboard.viewChallenge')}
      </ButtonLink>
    </Card>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" d="M12 5v14M5 12h14" />
    </svg>
  )
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="flex flex-col items-center gap-4 py-8">
        <Skeleton className="size-52 rounded-full" />
        <Skeleton className="h-5 w-40" />
      </Card>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-24" />
      </div>
    </div>
  )
}

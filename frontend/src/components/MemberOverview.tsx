import { useTranslation } from 'react-i18next'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useAsync } from '../lib/useAsync'
import { getMemberOverview } from '../lib/api'
import { formatPoints } from '../lib/format'
import { pesCategory } from '../lib/pesTitle'
import { useLogActivity } from '../context/logActivity'
import type { MemberOverview as Overview } from '../lib/types'
import { Card } from './ui/Card'
import { Avatar } from './ui/Avatar'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { ProgressRing } from './ui/ProgressRing'
import { Skeleton } from './ui/Skeleton'
import { EmptyState } from './ui/EmptyState'
import { ErrorState } from './ui/ErrorState'

const tooltip = {
  contentStyle: {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 8,
    fontSize: 12,
    color: 'var(--color-text)',
  },
  labelStyle: { color: 'var(--color-muted)' },
  itemStyle: { color: 'var(--color-text)' },
} as const

function shortRound(name: string): string {
  return name.split('—')[0].trim() || name
}

export function MemberOverview({ memberId, isSelf }: { memberId: string; isSelf?: boolean }) {
  const { data, loading, error, reload } = useAsync<Overview>(
    () => getMemberOverview(memberId),
    [memberId],
  )

  if (loading) return <OverviewSkeleton />
  if (error || !data) return <ErrorState onRetry={reload} />
  return <Body data={data} isSelf={isSelf} />
}

function Body({ data, isSelf }: { data: Overview; isSelf?: boolean }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language.startsWith('en') ? 'en' : 'cs'
  const { open: openLog } = useLogActivity()

  const title =
    data.topActivities.length === 0
      ? t('stats.pes.rookie')
      : t(`stats.pes.${pesCategory(data.topActivities[0].activityId)}`)
  const goalMet = data.weekly.weeklyPoints >= data.weekly.weeklyGoal

  const roundData = data.roundHistory.map((r) => ({ round: shortRound(r.name), points: r.total }))
  const hasDetail = data.cumulative.length > 0

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <Card className="flex flex-wrap items-center gap-4">
        <Avatar name={data.member.displayName} src={data.member.avatarUrl} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-text">{data.member.displayName}</h1>
            <Badge>{data.member.division}</Badge>
            {data.member.isHistorical && (
              <Badge variant="neutral">{t('overview.historical')}</Badge>
            )}
          </div>
          <div className="mt-1 text-sm text-primary">🐾 {title}</div>
          <div className="mt-1 text-sm text-muted">
            {formatPoints(data.records.lifetimePoints)} {t('overview.pts')} ·{' '}
            {t('overview.roundsPlayed', { count: data.records.roundsPlayed })}
          </div>
        </div>
        {isSelf && (
          <Button size="lg" onClick={openLog} className="hidden sm:inline-flex">
            {t('dashboard.logActivity')}
          </Button>
        )}
      </Card>

      {/* Weekly progress + this week's activities */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="flex flex-col items-center gap-3 py-6">
          <ProgressRing
            value={data.weekly.weeklyPoints}
            max={data.weekly.weeklyGoal}
            valueText={`${data.weekly.weeklyPoints} / ${data.weekly.weeklyGoal}`}
          >
            <span className="text-4xl font-bold text-text">
              {formatPoints(data.weekly.weeklyPoints)}
            </span>
            <span className="text-sm text-muted">/ {data.weekly.weeklyGoal}</span>
          </ProgressRing>
          <div className="flex items-center gap-2 text-sm text-muted">
            {goalMet && <span aria-hidden="true">🎉</span>}
            🔥 {t('dashboard.streakValue', { count: data.weekly.streakWeeks })}
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-semibold text-text">{t('overview.thisWeek')}</h2>
          {data.currentWeekActivities.length === 0 ? (
            <EmptyState title={t('overview.noActivities')} />
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {data.currentWeekActivities.map((a, i) => (
                <li key={i} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span className="min-w-0">
                    <span className="font-medium text-text">
                      {a.activityName ?? t('overview.quickAdd')}
                    </span>
                    <span className="text-muted">
                      {' · '}
                      {a.quantity} {a.unit}
                      {a.elevationM > 0 ? ` · ↑ ${a.elevationM} m` : ''}
                    </span>
                  </span>
                  <span className="shrink-0 font-medium tabular-nums text-text">
                    {formatPoints(a.points)} {t('overview.pts')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Record KPI tiles */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label={t('stats.bestWeek')} value={formatPoints(data.records.bestWeek)} />
        <Tile
          label={t('stats.longestStreak')}
          value={t('stats.weeks', { count: data.records.longestStreakWeeks })}
        />
        <Tile label={t('stats.weeksAtGoal')} value={String(data.records.weeksAtGoal)} />
        <Tile label={t('stats.favouriteActivity')} value={data.records.favouriteActivity} />
      </section>

      {/* Points by round */}
      <Card>
        <h2 className="mb-3 text-lg font-semibold text-text">{t('overview.pointsPerRound')}</h2>
        {roundData.length === 0 ? (
          <EmptyState title={t('stats.empty')} />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={roundData} margin={{ left: 4, right: 8 }}>
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
              <XAxis dataKey="round" stroke="var(--chart-axis)" fontSize={12} />
              <YAxis stroke="var(--chart-axis)" fontSize={12} width={44} />
              <RTooltip {...tooltip} cursor={{ fill: 'var(--color-border)', opacity: 0.3 }} />
              <Bar dataKey="points" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Distance & elevation (detailed entries only) */}
      <Card>
        <h2 className="mb-1 text-lg font-semibold text-text">
          {t('overview.distance')} & {t('overview.elevation')}
        </h2>
        {!hasDetail ? (
          <EmptyState title={t('overview.noDetailYet')} />
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3">
              <Tile
                label={t('overview.totalKm')}
                value={`${formatPoints(data.records.totalKm)} km`}
              />
              <Tile
                label={t('overview.totalElevation')}
                value={`${formatPoints(data.records.totalElevation)} m`}
              />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <CumChart
                title={t('overview.cumDistance')}
                data={data.cumulative.map((c) => ({ week: c.weekStart.slice(5), value: c.km }))}
                color="var(--chart-1)"
                unit="km"
              />
              <CumChart
                title={t('overview.cumElevation')}
                data={data.cumulative.map((c) => ({
                  week: c.weekStart.slice(5),
                  value: c.elevation,
                }))}
                color="var(--chart-4)"
                unit="m"
              />
            </div>
            {(data.distanceByActivity.length > 0 || data.elevationByActivity.length > 0) && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <ByActivity
                  title={t('overview.distance')}
                  rows={data.distanceByActivity.map((d) => ({
                    name: lang === 'en' ? d.nameEn : d.nameCs,
                    value: `${formatPoints(d.km)} km`,
                  }))}
                />
                <ByActivity
                  title={t('overview.elevation')}
                  rows={data.elevationByActivity.map((d) => ({
                    name: lang === 'en' ? d.nameEn : d.nameCs,
                    value: `${formatPoints(d.m)} m`,
                  }))}
                />
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
}

function CumChart({
  title,
  data,
  color,
  unit,
}: {
  title: string
  data: { week: string; value: number }[]
  color: string
  unit: string
}) {
  return (
    <div>
      <div className="mb-2 text-sm font-medium text-muted">{title}</div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ left: 4, right: 12 }}>
          <CartesianGrid stroke="var(--chart-grid)" />
          <XAxis dataKey="week" stroke="var(--chart-axis)" fontSize={11} />
          <YAxis stroke="var(--chart-axis)" fontSize={11} width={40} unit={unit} />
          <RTooltip {...tooltip} />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function ByActivity({ title, rows }: { title: string; rows: { name: string; value: string }[] }) {
  if (rows.length === 0) return null
  return (
    <div>
      <div className="mb-2 text-sm font-medium text-muted">{title}</div>
      <ul className="flex flex-col gap-1">
        {rows.map((r) => (
          <li key={r.name} className="flex items-center justify-between text-sm">
            <span className="text-text">{r.name}</span>
            <span className="tabular-nums text-muted">{r.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <div className="truncate text-xl font-bold text-text">{value}</div>
      <div className="mt-1 text-xs text-muted">{label}</div>
    </Card>
  )
}

function OverviewSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-24" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
      <Skeleton className="h-40" />
    </div>
  )
}

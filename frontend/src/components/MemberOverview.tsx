import { useTranslation } from 'react-i18next'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useAsync } from '../lib/useAsync'
import { getMemberOverview } from '../lib/api'
import { formatPoints } from '../lib/format'
import { pesCategory } from '../lib/pesTitle'
import { ActivityIcon } from './ActivityIcon'
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

/** Categorical palette for the by-activity pie (theme tokens; see theme.css). */
const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
  'var(--chart-7)',
  'var(--chart-8)',
  'var(--chart-9)',
  'var(--chart-10)',
]
const MAX_PIE_SLICES = 9

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
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Tile label={t('stats.bestWeek')} value={formatPoints(data.records.bestWeek)} />
        <Tile label={t('overview.avgWeekly')} value={formatPoints(data.records.avgWeeklyPoints)} />
        <Tile label={t('stats.weeksAtGoal')} value={String(data.records.weeksAtGoal)} />
        <Tile label={t('overview.weeksBelow')} value={String(data.records.weeksBelowGoal)} />
        <Tile
          label={t('stats.longestStreak')}
          value={t('stats.weeks', { count: data.records.longestStreakWeeks })}
        />
        <Tile label={t('stats.favouriteActivity')} value={data.records.favouriteActivity} />
      </section>

      {/* Best week — points, which week, and its activity breakdown */}
      {data.bestWeekDetail && data.bestWeekDetail.points > 0 && (
        <Card className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold text-text">{t('overview.bestWeekTitle')}</h2>
            <span className="text-sm text-muted">
              {shortRound(data.bestWeekDetail.roundName)} ·{' '}
              {t('overview.weekN', { n: data.bestWeekDetail.weekNumber })}
            </span>
          </div>
          <div className="text-3xl font-bold text-text">
            {formatPoints(data.bestWeekDetail.points)}{' '}
            <span className="text-base font-normal text-muted">{t('overview.pts')}</span>
          </div>
          {data.bestWeekDetail.activities.length > 0 && (
            <ul className="flex flex-col divide-y divide-border text-sm">
              {data.bestWeekDetail.activities.map((a, i) => (
                <li key={i} className="flex items-center justify-between gap-2 py-1.5">
                  <span className="flex min-w-0 items-center gap-2 text-text">
                    <ActivityIcon
                      activityId={a.activityId}
                      className="size-4 shrink-0 text-muted"
                    />
                    <span className="truncate">{a.activityName ?? t('overview.quickAdd')}</span>
                  </span>
                  <span className="shrink-0 font-medium tabular-nums text-muted">
                    {formatPoints(a.points)} {t('overview.pts')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {/* Points by activity (pie) + favourite activities (top 10) */}
      <div className="grid gap-6 lg:grid-cols-2">
        <PointsByActivityPie
          rows={data.pointsByActivity.map((a) => ({
            activityId: a.activityId,
            name: lang === 'en' ? a.nameEn : a.nameCs,
            points: a.points,
          }))}
        />
        <TopActivities
          rows={data.topActivities.map((a) => ({
            activityId: a.activityId,
            name: lang === 'en' ? a.nameEn : a.nameCs,
            points: a.points,
          }))}
        />
      </div>

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
                    activityId: d.activityId,
                    name: lang === 'en' ? d.nameEn : d.nameCs,
                    value: `${formatPoints(d.km)} km`,
                  }))}
                />
                <ByActivity
                  title={t('overview.elevation')}
                  rows={data.elevationByActivity.map((d) => ({
                    activityId: d.activityId,
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

function ByActivity({
  title,
  rows,
}: {
  title: string
  rows: { activityId: string | null; name: string; value: string }[]
}) {
  if (rows.length === 0) return null
  return (
    <div>
      <div className="mb-2 text-sm font-medium text-muted">{title}</div>
      <ul className="flex flex-col gap-1">
        {rows.map((r) => (
          <li key={r.name} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-2 text-text">
              <ActivityIcon activityId={r.activityId} className="size-4 shrink-0 text-muted" />
              <span className="truncate">{r.name}</span>
            </span>
            <span className="shrink-0 tabular-nums text-muted">{r.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Total points split by activity as a donut, with a coloured legend + %. */
function PointsByActivityPie({
  rows,
}: {
  rows: { activityId: string | null; name: string; points: number }[]
}) {
  const { t } = useTranslation()
  const sorted = [...rows].filter((r) => r.points > 0).sort((a, b) => b.points - a.points)
  const top = sorted.slice(0, MAX_PIE_SLICES)
  const restTotal = sorted.slice(MAX_PIE_SLICES).reduce((s, r) => s + r.points, 0)
  const slices = [
    ...top.map((r, i) => ({ ...r, color: CHART_COLORS[i % CHART_COLORS.length] })),
    ...(restTotal > 0
      ? [
          {
            activityId: null,
            name: t('overview.otherActivities'),
            points: restTotal,
            color: 'var(--color-muted)',
          },
        ]
      : []),
  ]
  const total = slices.reduce((s, r) => s + r.points, 0)

  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold text-text">{t('overview.pointsByActivity')}</h2>
      {total === 0 ? (
        <EmptyState title={t('stats.empty')} />
      ) : (
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <ResponsiveContainer width="100%" height={200} className="max-w-[220px]">
            <PieChart>
              <Pie
                data={slices}
                dataKey="points"
                nameKey="name"
                innerRadius={45}
                outerRadius={80}
                paddingAngle={1}
                stroke="var(--color-surface)"
              >
                {slices.map((s, i) => (
                  <Cell key={i} fill={s.color} />
                ))}
              </Pie>
              <RTooltip
                {...tooltip}
                formatter={(v) => `${formatPoints(Number(v))} ${t('overview.pts')}`}
              />
            </PieChart>
          </ResponsiveContainer>
          <ul className="flex w-full flex-col gap-1.5 text-sm">
            {slices.map((s, i) => (
              <li key={i} className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="inline-block size-3 shrink-0 rounded-[3px]"
                  style={{ background: s.color }}
                />
                <ActivityIcon activityId={s.activityId} className="size-4 shrink-0 text-muted" />
                <span className="min-w-0 flex-1 truncate text-text">{s.name}</span>
                <span className="shrink-0 tabular-nums text-muted">
                  {Math.round((s.points / total) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}

/** The member's favourite activities (top 10 by points). */
function TopActivities({
  rows,
}: {
  rows: { activityId: string | null; name: string; points: number }[]
}) {
  const { t } = useTranslation()
  if (rows.length === 0) {
    return (
      <Card>
        <h2 className="mb-3 text-lg font-semibold text-text">{t('overview.topActivities')}</h2>
        <EmptyState title={t('overview.noDetailYet')} />
      </Card>
    )
  }
  const max = Math.max(...rows.map((r) => r.points), 1)
  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold text-text">{t('overview.topActivities')}</h2>
      <ol className="flex flex-col gap-2">
        {rows.map((r, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <span className="w-5 shrink-0 tabular-nums text-muted">{i + 1}.</span>
            <ActivityIcon activityId={r.activityId} className="size-4 shrink-0 text-primary" />
            <span className="w-24 shrink-0 truncate text-text">{r.name}</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-secondary/15">
              <span
                className="block h-full rounded-full bg-primary"
                style={{ width: `${Math.max(4, (r.points / max) * 100)}%` }}
              />
            </span>
            <span className="w-14 shrink-0 text-right tabular-nums text-muted">
              {formatPoints(r.points)}
            </span>
          </li>
        ))}
      </ol>
    </Card>
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

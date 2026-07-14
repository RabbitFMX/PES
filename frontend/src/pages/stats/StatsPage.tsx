import { useState } from 'react'
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
import { useAsync } from '../../lib/useAsync'
import { getRounds, getStats } from '../../lib/mockApi'
import { formatDate, formatPoints } from '../../lib/format'
import type { Round, StatsData } from '../../lib/types'
import { Card } from '../../components/ui/Card'
import { Select } from '../../components/ui/Select'
import { Skeleton } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'

export function StatsPage() {
  const { t, i18n } = useTranslation()
  const rounds = useAsync<Round[]>(getRounds)
  const [roundId, setRoundId] = useState<string>('')
  const stats = useAsync<StatsData>(() => getStats(roundId || undefined), [roundId])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-text">{t('stats.title')}</h1>
        {rounds.data && (
          <div className="w-64 max-w-full">
            <Select
              label={t('stats.round')}
              value={roundId || rounds.data[0]?.id}
              onChange={(e) => setRoundId(e.target.value)}
              options={rounds.data.map((r) => ({ value: r.id, label: r.name }))}
            />
          </div>
        )}
      </div>

      {stats.loading ? (
        <StatsSkeleton />
      ) : stats.error || !stats.data ? (
        <ErrorState onRetry={stats.reload} />
      ) : stats.data.records.lifetimePoints === 0 ? (
        <EmptyState title={t('stats.empty')} />
      ) : (
        <StatsBody data={stats.data} locale={i18n.language} />
      )}
    </div>
  )
}

function StatsBody({ data, locale }: { data: StatsData; locale: string }) {
  const { t } = useTranslation()
  const r = data.records

  return (
    <div className="flex flex-col gap-6">
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        <RecordCard label={t('stats.bestWeek')} value={formatPoints(r.bestWeek)} />
        <RecordCard label={t('stats.bestRoundFinish')} value={r.bestRoundFinish} />
        <RecordCard label={t('stats.favouriteActivity')} value={r.favouriteActivity} />
        <RecordCard label={t('stats.lifetimePoints')} value={formatPoints(r.lifetimePoints)} />
        <RecordCard
          label={t('stats.longestStreak')}
          value={t('stats.weeks', { count: r.longestStreakWeeks })}
        />
        <RecordCard label={t('stats.totalKm')} value={t('stats.km', { count: r.totalKmAllTime })} />
        <RecordCard label={t('stats.weeksAtGoal')} value={String(r.weeksAtGoal)} />
      </section>

      {data.routineDetected && (
        <Card className="flex items-center gap-3 bg-success/10">
          <span aria-hidden="true" className="text-2xl">
            🐾
          </span>
          <div>
            <div className="text-xs font-semibold tracking-wide text-success uppercase">
              {t('stats.routine')}
            </div>
            <div className="font-medium text-text">{data.routineDetected}</div>
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title={t('stats.pointsOverTime')}>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart
              data={data.pointsOverTime.map((d) => ({ ...d, label: formatDate(d.date, locale) }))}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="label" stroke="var(--color-muted)" fontSize={12} />
              <YAxis stroke="var(--color-muted)" fontSize={12} width={32} />
              <RTooltip />
              <Line
                type="monotone"
                dataKey="points"
                stroke="var(--color-primary)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t('stats.pointsByDay')}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.pointsByDayOfWeek}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="day" stroke="var(--color-muted)" fontSize={12} />
              <YAxis stroke="var(--color-muted)" fontSize={12} width={32} />
              <RTooltip />
              <Bar dataKey="points" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <Card>
        <h2 className="mb-3 text-lg font-semibold text-text">{t('stats.currentWeek')}</h2>
        <ul className="flex flex-col gap-1">
          {data.currentWeekByDay.map((d) => (
            <li key={d.day} className="flex items-center justify-between text-sm">
              <span className="text-muted">{d.day}</span>
              <span className={d.points > 0 ? 'font-medium text-text' : 'text-muted'}>
                {formatPoints(d.points)}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}

function RecordCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <div className="text-xl font-bold text-text">{value}</div>
      <div className="mt-1 text-xs text-muted">{label}</div>
    </Card>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold text-text">{title}</h2>
      {children}
    </Card>
  )
}

function StatsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  )
}

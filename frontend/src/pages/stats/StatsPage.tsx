import { useMemo, useState } from 'react'
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
import { getPackStats } from '../../lib/api'
import { formatPoints } from '../../lib/format'
import type { PackStats } from '../../lib/types'
import { Card } from '../../components/ui/Card'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Skeleton } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'

const SERIES = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)']
const MAX_COMPARE = 4

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

/** "R11 — Zima/Jaro 2026" → "R11" for compact axes. */
function shortRound(name: string): string {
  return name.split('—')[0].trim() || name
}

export function StatsPage() {
  const { t } = useTranslation()
  const stats = useAsync<PackStats>(getPackStats)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-text">{t('stats.title')}</h1>
        <p className="text-sm text-muted">{t('stats.subtitle')}</p>
      </div>

      {stats.loading ? (
        <StatsSkeleton />
      ) : stats.error || !stats.data ? (
        <ErrorState onRetry={stats.reload} />
      ) : stats.data.rounds.length === 0 ? (
        <EmptyState title={t('stats.empty')} />
      ) : (
        <PackBody data={stats.data} />
      )}
    </div>
  )
}

function PackBody({ data }: { data: PackStats }) {
  const { t } = useTranslation()
  const top = data.allTime.slice(0, 12)
  const barData = [...top].reverse().map((m) => ({ name: m.displayName, points: m.lifetimePoints }))
  const roundData = data.rounds.map((r) => ({
    round: shortRound(r.name),
    points: r.groupTotal,
    participants: r.participants,
  }))

  // Compare: default to the top 3 members.
  const [selected, setSelected] = useState<string[]>(() =>
    data.allTime.slice(0, 3).map((m) => m.memberId),
  )
  const toggle = (id: string) =>
    setSelected((cur) =>
      cur.includes(id)
        ? cur.filter((x) => x !== id)
        : cur.length < MAX_COMPARE
          ? [...cur, id]
          : cur,
    )
  const selectedMembers = useMemo(
    () => selected.map((id) => data.roundTotals.find((m) => m.memberId === id)!).filter(Boolean),
    [selected, data.roundTotals],
  )
  const compareData = useMemo(
    () =>
      data.rounds.map((r, i) => {
        const row: Record<string, string | number | null> = { round: shortRound(r.name) }
        for (const m of selectedMembers) row[m.displayName] = m.totals[i]
        return row
      }),
    [data.rounds, selectedMembers],
  )

  return (
    <div className="flex flex-col gap-6">
      {/* KPI row */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label={t('stats.kpiRounds')} value={String(data.totals.rounds)} />
        <StatTile label={t('stats.kpiMembers')} value={String(data.totals.members)} />
        <StatTile label={t('stats.kpiPoints')} value={formatPoints(data.totals.allTimePoints)} />
        <StatTile label={t('stats.kpiCurrent')} value={data.totals.currentRoundName ?? '—'} />
      </section>

      {/* All-time ranking: chart + table (table = the relief for low-contrast marks) */}
      <Card>
        <h2 className="mb-3 text-lg font-semibold text-text">{t('stats.allTime')}</h2>
        <ResponsiveContainer width="100%" height={Math.max(220, barData.length * 26)}>
          <BarChart data={barData} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid horizontal={false} stroke="var(--chart-grid)" />
            <XAxis type="number" stroke="var(--chart-axis)" fontSize={12} />
            <YAxis
              type="category"
              dataKey="name"
              width={92}
              stroke="var(--chart-axis)"
              fontSize={12}
            />
            <RTooltip {...tooltip} cursor={{ fill: 'var(--color-border)', opacity: 0.3 }} />
            <Bar dataKey="points" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="py-2 pr-2">#</th>
                <th className="py-2 pr-2">{t('stats.colMember')}</th>
                <th className="py-2 pr-2 text-right tabular-nums">{t('stats.colPoints')}</th>
                <th className="py-2 pr-2 text-right tabular-nums">{t('stats.colRounds')}</th>
                <th className="py-2 text-right tabular-nums">{t('stats.colWins')}</th>
              </tr>
            </thead>
            <tbody>
              {data.allTime.map((m, i) => (
                <tr key={m.memberId} className="border-b border-border/60">
                  <td className="py-2 pr-2 tabular-nums text-muted">{i + 1}</td>
                  <td className="py-2 pr-2">
                    <div className="flex items-center gap-2">
                      <Avatar name={m.displayName} src={m.avatarUrl} size="sm" />
                      <span className="font-medium text-text">{m.displayName}</span>
                      <Badge>{m.division}</Badge>
                    </div>
                  </td>
                  <td className="py-2 pr-2 text-right font-medium tabular-nums text-text">
                    {formatPoints(m.lifetimePoints)}
                  </td>
                  <td className="py-2 pr-2 text-right tabular-nums text-muted">{m.roundsPlayed}</td>
                  <td className="py-2 text-right tabular-nums text-text">
                    {m.wins > 0 ? `🏆 ${m.wins}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Group activity by round */}
      <Card>
        <h2 className="mb-3 text-lg font-semibold text-text">{t('stats.groupPerRound')}</h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={roundData} margin={{ left: 4, right: 8 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="round" stroke="var(--chart-axis)" fontSize={12} />
            <YAxis stroke="var(--chart-axis)" fontSize={12} width={44} />
            <RTooltip {...tooltip} cursor={{ fill: 'var(--color-border)', opacity: 0.3 }} />
            <Bar dataKey="points" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Compare members */}
      <Card>
        <h2 className="text-lg font-semibold text-text">{t('stats.compare')}</h2>
        <p className="mb-3 text-xs text-muted">{t('stats.compareHint', { max: MAX_COMPARE })}</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {top.map((m) => {
            const on = selected.includes(m.memberId)
            const idx = selected.indexOf(m.memberId)
            return (
              <button
                key={m.memberId}
                type="button"
                onClick={() => toggle(m.memberId)}
                aria-pressed={on}
                className={
                  'rounded-full px-3 py-1 text-sm ring-1 transition-colors ' +
                  (on ? 'text-text ring-transparent' : 'text-muted ring-border hover:text-text')
                }
                style={
                  on
                    ? { background: SERIES[idx % SERIES.length], color: 'var(--color-on-primary)' }
                    : undefined
                }
              >
                {m.displayName}
              </button>
            )
          })}
        </div>

        {selectedMembers.length === 0 ? (
          <EmptyState title={t('stats.comparePick')} />
        ) : (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={compareData} margin={{ left: 4, right: 16 }}>
                <CartesianGrid stroke="var(--chart-grid)" />
                <XAxis dataKey="round" stroke="var(--chart-axis)" fontSize={12} />
                <YAxis stroke="var(--chart-axis)" fontSize={12} width={44} />
                <RTooltip {...tooltip} />
                {selectedMembers.map((m, idx) => (
                  <Line
                    key={m.memberId}
                    type="monotone"
                    dataKey={m.displayName}
                    stroke={SERIES[idx % SERIES.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
            {/* Legend in text ink with colour swatches (identity never colour-only) */}
            <ul className="mt-3 flex flex-wrap gap-4">
              {selectedMembers.map((m, idx) => (
                <li key={m.memberId} className="flex items-center gap-2 text-sm text-text">
                  <span
                    aria-hidden="true"
                    className="inline-block size-3 rounded-full"
                    style={{ background: SERIES[idx % SERIES.length] }}
                  />
                  {m.displayName}
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      {/* Round winners */}
      <Card>
        <h2 className="mb-3 text-lg font-semibold text-text">{t('stats.winners')}</h2>
        <ul className="flex flex-col gap-1">
          {[...data.rounds].reverse().map((r) => (
            <li
              key={r.roundId}
              className="flex items-center justify-between border-b border-border/60 py-2 text-sm last:border-0"
            >
              <span className="text-muted">{shortRound(r.name)}</span>
              <span className="flex items-center gap-2 text-text">
                {r.winner ? (
                  <>
                    <span aria-hidden="true">🏆</span>
                    <span className="font-medium">{r.winner.displayName}</span>
                    <span className="tabular-nums text-muted">{formatPoints(r.winner.total)}</span>
                  </>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <div className="truncate text-2xl font-bold text-text">{value}</div>
      <div className="mt-1 text-xs text-muted">{label}</div>
    </Card>
  )
}

function StatsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <Skeleton className="h-80" />
      <Skeleton className="h-64" />
    </div>
  )
}

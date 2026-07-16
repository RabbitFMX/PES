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
import type { PackAllTimeRow, PackStats } from '../../lib/types'
import { Card } from '../../components/ui/Card'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Input } from '../../components/ui/Input'
import { DogAvatar } from '../../components/DogAvatar'
import { dogFromSeed, isDogAvatar, parseDog } from '../../lib/dogAvatar'
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

function medal(rank: number): string | null {
  return rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null
}

// Map an activity id to a "PES <role>" signature key.
const PES_CATEGORY: Record<string, string> = {
  run: 'runner',
  swim: 'swimmer',
  hike: 'hiker',
  'bike-road': 'cyclist',
  'bike-gravel': 'cyclist',
  'bike-mtb': 'cyclist',
  'bike-stroller': 'cyclist',
  xcski: 'xcskier',
  skitour: 'skimo',
  downhill: 'skier',
  skates: 'skater',
  paddleboard: 'paddler',
  kayak: 'kayaker',
}
const STRONG = new Set([
  'pushups',
  'squats',
  'situps',
  'pullups',
  'dips',
  'burpees',
  'burpees-pushup',
  'plank',
  'plank-sally',
  'lunges',
  'mountain-climber',
  'hip-raises',
  'hanging-leg-raises',
  'jumprope',
  'tabata',
  'sun-salutation',
  'vups',
])
function pesCategory(id: string): string {
  return PES_CATEGORY[id] ?? (STRONG.has(id) ? 'strong' : 'athlete')
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
  const { t, i18n } = useTranslation()
  const lang = i18n.language.startsWith('en') ? 'en' : 'cs'
  const podium = data.allTime.slice(0, 10)
  const roundData = data.rounds.map((r) => ({ round: shortRound(r.name), points: r.groupTotal }))

  const pesTitle = (m: PackAllTimeRow) =>
    m.topActivities.length === 0
      ? t('stats.pes.rookie')
      : t(`stats.pes.${pesCategory(m.topActivities[0].activityId)}`)
  const actName = (a: { nameCs: string; nameEn: string }) => (lang === 'en' ? a.nameEn : a.nameCs)

  // Compare: pick from ALL members (searchable); default the top 3.
  const [query, setQuery] = useState('')
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
  const filtered = data.allTime.filter((m) =>
    m.displayName.toLowerCase().includes(query.toLowerCase()),
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

  // Round-winners accordion → full ranking with medals.
  const [openRound, setOpenRound] = useState<string | null>(null)
  const roundRanking = (roundIndex: number) => {
    const rows = data.roundTotals
      .map((m) => ({
        memberId: m.memberId,
        displayName: m.displayName,
        total: m.totals[roundIndex],
      }))
      .filter((r): r is { memberId: string; displayName: string; total: number } => r.total != null)
      .sort((a, b) => b.total - a.total)
    let lastTotal: number | null = null
    let lastRank = 0
    return rows.map((r, idx) => {
      const rank = lastTotal !== null && r.total === lastTotal ? lastRank : idx + 1
      lastTotal = r.total
      lastRank = rank
      return { ...r, rank }
    })
  }
  // rounds are shown newest-first; map back to the chronological index for totals.
  const chronoIndex = (roundId: string) => data.rounds.findIndex((r) => r.roundId === roundId)

  return (
    <div className="flex flex-col gap-6">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label={t('stats.kpiRounds')} value={String(data.totals.rounds)} />
        <StatTile label={t('stats.kpiMembers')} value={String(data.totals.members)} />
        <StatTile label={t('stats.kpiPoints')} value={formatPoints(data.totals.allTimePoints)} />
        <StatTile label={t('stats.kpiCurrent')} value={data.totals.currentRoundName ?? '—'} />
      </section>

      {/* All-time ranking: chart + table with signature titles */}
      <Card>
        <h2 className="mb-3 text-lg font-semibold text-text">{t('stats.allTime')}</h2>
        <DogColumns rows={podium} />

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
                <tr key={m.memberId} className="border-b border-border/60 align-top">
                  <td className="py-2 pr-2 tabular-nums text-muted">{i + 1}</td>
                  <td className="py-2 pr-2">
                    <div className="flex items-center gap-2">
                      <Avatar name={m.displayName} src={m.avatarUrl} size="sm" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-text">{m.displayName}</span>
                          <Badge>{m.division}</Badge>
                        </div>
                        <div className="text-xs text-primary">🐾 {pesTitle(m)}</div>
                        {m.topActivities.length > 0 && (
                          <div className="text-xs text-muted">
                            {m.topActivities.map((a) => actName(a)).join(' · ')}
                          </div>
                        )}
                      </div>
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

      {/* Compare members (all members, searchable) */}
      <Card>
        <h2 className="text-lg font-semibold text-text">{t('stats.compare')}</h2>
        <p className="mb-3 text-xs text-muted">{t('stats.compareHint', { max: MAX_COMPARE })}</p>
        <div className="mb-2 max-w-xs">
          <Input
            label={t('stats.searchMember')}
            placeholder={t('stats.searchMember')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="mb-4 flex max-h-40 flex-wrap gap-2 overflow-y-auto">
          {filtered.map((m) => {
            const on = selected.includes(m.memberId)
            const idx = selected.indexOf(m.memberId)
            return (
              <button
                key={m.memberId}
                type="button"
                onClick={() => toggle(m.memberId)}
                aria-pressed={on}
                className={
                  'h-fit rounded-full px-3 py-1 text-sm ring-1 transition-colors ' +
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

      {/* Round winners — expand to the full ranking with medals */}
      <Card>
        <h2 className="mb-3 text-lg font-semibold text-text">{t('stats.winners')}</h2>
        <ul className="flex flex-col">
          {[...data.rounds].reverse().map((r) => {
            const isOpen = openRound === r.roundId
            return (
              <li key={r.roundId} className="border-b border-border/60 last:border-0">
                <button
                  type="button"
                  onClick={() => setOpenRound(isOpen ? null : r.roundId)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between py-2 text-left text-sm"
                >
                  <span className="flex items-center gap-2 text-muted">
                    <span aria-hidden="true" className="text-xs">
                      {isOpen ? '▾' : '▸'}
                    </span>
                    {shortRound(r.name)}
                  </span>
                  <span className="flex items-center gap-2 text-text">
                    {r.winner ? (
                      <>
                        <span aria-hidden="true">🏆</span>
                        <span className="font-medium">{r.winner.displayName}</span>
                        <span className="tabular-nums text-muted">
                          {formatPoints(r.winner.total)}
                        </span>
                      </>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </span>
                </button>
                {isOpen && (
                  <ol className="mb-3 flex flex-col gap-1 pl-6">
                    {roundRanking(chronoIndex(r.roundId)).map((row) => (
                      <li key={row.memberId} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span className="w-6 tabular-nums text-muted">
                            {medal(row.rank) ?? `${row.rank}.`}
                          </span>
                          <span className="text-text">{row.displayName}</span>
                        </span>
                        <span className="tabular-nums text-muted">{formatPoints(row.total)}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </li>
            )
          })}
        </ul>
      </Card>
    </div>
  )
}

/** All-time top-10 as a column chart: each column is a dog wearing a points collar. */
function DogColumns({ rows }: { rows: PackAllTimeRow[] }) {
  const max = Math.max(...rows.map((r) => r.lifetimePoints), 1)
  const MAXBAR = 150
  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex items-end gap-2" style={{ minHeight: MAXBAR + 96 }}>
        {rows.map((m) => {
          const cfg = isDogAvatar(m.avatarUrl) ? parseDog(m.avatarUrl) : dogFromSeed(m.memberId)
          const barPx = Math.max(6, Math.round((m.lifetimePoints / max) * MAXBAR))
          return (
            <div key={m.memberId} className="flex w-16 shrink-0 flex-col items-center">
              <div
                className="flex flex-col items-center justify-end"
                style={{ height: MAXBAR + 64 }}
              >
                <DogAvatar config={cfg} title={m.displayName} className="size-12" />
                <div className="z-10 -mt-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold tabular-nums text-on-accent shadow-[var(--shadow-card)] ring-1 ring-border">
                  {Math.round(m.lifetimePoints).toLocaleString('cs-CZ')}
                </div>
                <div
                  className="mt-1 w-5 rounded-t-[var(--radius-sm)] bg-primary"
                  style={{ height: barPx }}
                />
              </div>
              <div className="mt-1 w-full truncate text-center text-xs text-muted">
                {m.displayName}
              </div>
            </div>
          )
        })}
      </div>
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

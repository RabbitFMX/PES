import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAsync } from '../../lib/useAsync'
import { getLeaderboard, getRoundOptions } from '../../lib/api'
import { formatPoints } from '../../lib/format'
import { cn } from '../../lib/cn'
import type { LeaderboardData, LeaderboardRow, RoundOption } from '../../lib/types'
import { Tabs } from '../../components/ui/Tabs'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Avatar } from '../../components/ui/Avatar'
import { Select } from '../../components/ui/Select'
import { ActivityIcon } from '../../components/ActivityIcon'
import { Skeleton } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'

export function LeaderboardPage() {
  const { t } = useTranslation()
  const [roundId, setRoundId] = useState<string | undefined>(undefined)
  const [pack, setPack] = useState<'A' | 'B'>('A')
  const rounds = useAsync<RoundOption[]>(getRoundOptions)
  const { data, loading, error, reload } = useAsync<LeaderboardData>(
    () => getLeaderboard(roundId),
    [roundId],
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-text">{t('leaderboard.title')}</h1>
        {rounds.data && rounds.data.length > 0 && (
          <div className="w-56">
            <Select
              label={t('leaderboard.round')}
              value={roundId ?? data?.roundId ?? ''}
              onChange={(e) => setRoundId(e.target.value || undefined)}
              options={rounds.data.map((r) => ({
                value: r.id,
                label: r.status === 'open' ? `${r.name} • ${t('leaderboard.live')}` : r.name,
              }))}
            />
          </div>
        )}
      </div>

      <Tabs
        idPrefix="lb"
        ariaLabel={t('leaderboard.title')}
        active={pack}
        onChange={(id) => setPack(id as 'A' | 'B')}
        tabs={[
          { id: 'A', label: t('leaderboard.packA') },
          { id: 'B', label: t('leaderboard.packB') },
        ]}
      />

      <div role="tabpanel" id={`lb-panel-${pack}`} aria-labelledby={`lb-tab-${pack}`}>
        {loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : error || !data ? (
          <ErrorState onRetry={reload} />
        ) : (
          <LeaderboardTable
            rows={pack === 'A' ? data.packA : data.packB}
            showGoal={data.isOpenRound}
          />
        )}
      </div>
    </div>
  )
}

function LeaderboardTable({ rows, showGoal }: { rows: LeaderboardRow[]; showGoal: boolean }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState<string | null>(null)

  if (rows.length === 0) {
    return <EmptyState title={t('leaderboard.empty')} />
  }

  const toggle = (id: string) => setExpanded((cur) => (cur === id ? null : id))

  return (
    <div className="flex flex-col gap-2">
      {rows.map((r) => (
        <Card key={r.memberId} highlighted={r.isCurrentUser} className="flex flex-col gap-0 p-0">
          <div className="flex items-center gap-3 p-3">
            <span className="w-6 text-center text-lg font-bold text-muted">{r.rank}</span>
            <Avatar name={r.displayName} src={r.avatarUrl} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Link
                  to={`/members/${r.memberId}`}
                  className="truncate font-medium text-text hover:text-primary hover:underline"
                >
                  {r.displayName}
                </Link>
                {r.isCurrentUser && <Badge variant="primary">{t('leaderboard.you')}</Badge>}
              </div>
              <div className="text-sm text-muted">
                {formatPoints(r.roundTotal)} {t('overview.pts')}
              </div>
            </div>
            {showGoal && <GoalBadge met={r.goalMetThisWeek} />}
            {r.pointsByActivity.length > 0 && (
              <button
                type="button"
                aria-label={t('leaderboard.breakdown')}
                aria-expanded={expanded === r.memberId}
                onClick={() => toggle(r.memberId)}
                className="rounded-full p-1.5 text-muted hover:bg-secondary/10 hover:text-text"
              >
                <svg
                  viewBox="0 0 24 24"
                  className={cn(
                    'size-5 transition-transform',
                    expanded === r.memberId && 'rotate-180',
                  )}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
                </svg>
              </button>
            )}
          </div>
          {expanded === r.memberId && (
            <ul className="flex flex-col divide-y divide-border border-t border-border px-3 py-1 text-sm">
              {r.pointsByActivity.map((a) => (
                <li
                  key={a.activityId ?? 'quickadd'}
                  className="flex items-center justify-between gap-2 py-1.5"
                >
                  <span className="flex min-w-0 items-center gap-2 text-text">
                    <ActivityIcon
                      activityId={a.activityId}
                      className="size-4 shrink-0 text-muted"
                    />
                    <span className="truncate">
                      <ActivityName row={a} />
                    </span>
                  </span>
                  <span className="shrink-0 font-medium tabular-nums text-muted">
                    {formatPoints(a.points)} {t('overview.pts')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ))}
    </div>
  )
}

function ActivityName({ row }: { row: LeaderboardRow['pointsByActivity'][number] }) {
  const { t, i18n } = useTranslation()
  if (row.activityId === null) return <>{t('overview.quickAdd')}</>
  return <>{i18n.language.startsWith('en') ? row.nameEn : row.nameCs}</>
}

function GoalBadge({ met }: { met: boolean }) {
  const { t } = useTranslation()
  return met ? (
    <Badge variant="success">{t('leaderboard.goalMet')}</Badge>
  ) : (
    <Badge variant="neutral">{t('leaderboard.goalNotMet')}</Badge>
  )
}

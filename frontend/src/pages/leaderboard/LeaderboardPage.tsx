import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAsync } from '../../lib/useAsync'
import { getLeaderboard } from '../../lib/api'
import { formatPoints } from '../../lib/format'
import { cn } from '../../lib/cn'
import type { LeaderboardData, LeaderboardRow } from '../../lib/types'
import { Tabs } from '../../components/ui/Tabs'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Avatar } from '../../components/ui/Avatar'
import { Skeleton } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'

export function LeaderboardPage() {
  const { t } = useTranslation()
  const { data, loading, error, reload } = useAsync<LeaderboardData>(getLeaderboard)
  const [pack, setPack] = useState<'A' | 'B'>('A')

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-text">{t('leaderboard.title')}</h1>

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
          <LeaderboardTable rows={pack === 'A' ? data.packA : data.packB} />
        )}
      </div>
    </div>
  )
}

function LeaderboardTable({ rows }: { rows: LeaderboardRow[] }) {
  const { t } = useTranslation()

  if (rows.length === 0) {
    return <EmptyState title={t('leaderboard.empty')} />
  }

  return (
    <>
      {/* Desktop table */}
      <table className="hidden w-full border-collapse lg:table">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted">
            <th className="w-12 px-3 py-2 font-medium">{t('leaderboard.rank')}</th>
            <th className="px-3 py-2 font-medium">{t('leaderboard.member')}</th>
            <th className="px-3 py-2 text-right font-medium">{t('leaderboard.roundTotal')}</th>
            <th className="px-3 py-2 text-right font-medium">{t('leaderboard.goalMet')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.memberId}
              className={cn('border-b border-border', r.isCurrentUser && 'bg-primary/5')}
            >
              <td className="px-3 py-3 text-lg font-bold text-muted">{r.rank}</td>
              <td className="px-3 py-3">
                <div className="flex items-center gap-3">
                  <Avatar name={r.displayName} src={r.avatarUrl} size="sm" />
                  <span className="font-medium text-text">{r.displayName}</span>
                  {r.isCurrentUser && <Badge variant="primary">{t('leaderboard.you')}</Badge>}
                </div>
              </td>
              <td className="px-3 py-3 text-right font-semibold text-text">
                {formatPoints(r.roundTotal)}
              </td>
              <td className="px-3 py-3 text-right">
                <GoalBadge met={r.goalMetThisWeek} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile cards */}
      <div className="flex flex-col gap-2 lg:hidden">
        {rows.map((r) => (
          <Card key={r.memberId} highlighted={r.isCurrentUser} className="flex items-center gap-3">
            <span className="w-6 text-center text-lg font-bold text-muted">{r.rank}</span>
            <Avatar name={r.displayName} src={r.avatarUrl} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium text-text">{r.displayName}</span>
                {r.isCurrentUser && <Badge variant="primary">{t('leaderboard.you')}</Badge>}
              </div>
              <div className="text-sm text-muted">{formatPoints(r.roundTotal)}</div>
            </div>
            <GoalBadge met={r.goalMetThisWeek} />
          </Card>
        ))}
      </div>
    </>
  )
}

function GoalBadge({ met }: { met: boolean }) {
  const { t } = useTranslation()
  return met ? (
    <Badge variant="success">{t('leaderboard.goalMet')}</Badge>
  ) : (
    <Badge variant="neutral">{t('leaderboard.goalNotMet')}</Badge>
  )
}

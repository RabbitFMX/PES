import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAsync } from '../../lib/useAsync'
import { getAdminChallenge, setChallengeScores } from '../../lib/api'
import type { AdminChallenge } from '../../lib/types'
import { useToast } from '../../context/toast'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Skeleton } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'

/** Admin: award / edit completion points for the current week's challenge. */
export function ChallengesPanel() {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const { data, loading, error, reload } = useAsync<AdminChallenge>(getAdminChallenge)
  // Working points per member id (string inputs), seeded lazily from the fetch.
  const [points, setPoints] = useState<Record<string, string> | null>(null)
  const [busy, setBusy] = useState(false)

  if (loading) return <Skeleton className="h-64" />
  if (error || !data) return <ErrorState onRetry={reload} />
  if (!data.challengeId) return <EmptyState title={t('challenges.empty')} />

  const values =
    points ?? Object.fromEntries(data.members.map((m) => [m.memberId, String(m.points)]))
  const set = (id: string, v: string) => setPoints({ ...values, [id]: v })

  async function save() {
    if (!data?.challengeId) return
    setBusy(true)
    try {
      const scores = data.members.map((m) => ({
        memberId: m.memberId,
        points: Number(values[m.memberId]) || 0,
      }))
      const res = await setChallengeScores(data.challengeId, scores)
      if (res.ok) {
        showToast({ message: t('admin.saveSuccess'), variant: 'success' })
        setPoints(null)
        reload()
      } else {
        showToast({ message: res.message, variant: 'error' })
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold text-text">{data.title}</h2>
        <Badge variant="neutral">
          {data.scoringMode === 'completion'
            ? t('challenges.modeCompletion')
            : t('challenges.modeCompetitive')}
        </Badge>
      </Card>

      <p className="text-sm text-muted">
        {data.scoringMode === 'competitive'
          ? t('admin.challengeAwardCompetitiveHint')
          : t('admin.challengeAwardHint')}
      </p>

      <div className="flex flex-col gap-2">
        {data.members.map((m) => (
          <Card key={m.memberId} className="flex items-center gap-3">
            <span className="flex-1 truncate text-text">
              {m.displayName} <Badge variant="neutral">{m.division}</Badge>
            </span>
            <div className="w-28">
              <Input
                label={t('challenges.awards')}
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={values[m.memberId] ?? '0'}
                onChange={(e) => set(m.memberId, e.target.value)}
              />
            </div>
          </Card>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={save} loading={busy}>
          {t('common.save')}
        </Button>
      </div>
    </div>
  )
}

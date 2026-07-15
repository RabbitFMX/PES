import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAsync } from '../../lib/useAsync'
import { getRounds, saveRound } from '../../lib/api'
import type { Round } from '../../lib/types'
import { useToast } from '../../context/toast'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/ErrorState'

export function RoundsPanel() {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const { data, loading, error, reload } = useAsync<Round[]>(getRounds)
  const [busyId, setBusyId] = useState<string | null>(null)

  if (loading) return <Skeleton className="h-48" />
  if (error || !data) return <ErrorState onRetry={reload} />

  async function toggle(round: Round) {
    setBusyId(round.id)
    try {
      const next: Round = { ...round, status: round.status === 'open' ? 'closed' : 'open' }
      const res = await saveRound(next)
      if (res.ok) {
        showToast({ message: t('admin.saveSuccess'), variant: 'success' })
        reload()
      } else {
        showToast({ message: res.message, variant: 'error' })
      }
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {data.map((round) => (
        <Card key={round.id} className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-medium text-text">{round.name}</div>
            <div className="text-xs text-muted">
              {round.startDate} → {round.endDate}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={round.status === 'open' ? 'success' : 'neutral'}>{round.status}</Badge>
            <Button
              variant="secondary"
              size="sm"
              loading={busyId === round.id}
              onClick={() => toggle(round)}
            >
              {round.status === 'open' ? t('admin.closeRound') : t('admin.openRound')}
            </Button>
          </div>
        </Card>
      ))}
    </div>
  )
}

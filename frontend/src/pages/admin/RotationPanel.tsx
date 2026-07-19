import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAsync } from '../../lib/useAsync'
import { getMembers, getRotation, saveRotation } from '../../lib/api'
import type { Member, RotationEntry } from '../../lib/types'
import { useToast } from '../../context/toast'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/ErrorState'

export function RotationPanel() {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const { data, loading, error, reload } = useAsync<RotationEntry[]>(getRotation)
  const members = useAsync<Member[]>(getMembers)
  // Local working copy once the admin edits (reorder / add / remove); derived,
  // so no state-syncing effect is needed.
  const [working, setWorking] = useState<RotationEntry[] | null>(null)
  const [toAdd, setToAdd] = useState('')
  const [busy, setBusy] = useState(false)

  if (loading) return <Skeleton className="h-48" />
  if (error) return <ErrorState onRetry={reload} />

  const order = working ?? data ?? []
  const inRotation = new Set(order.map((e) => e.memberId))
  const addable = (members.data ?? []).filter((m) => m.status === 'active' && !inRotation.has(m.id))

  function move(index: number, dir: -1 | 1) {
    const next = [...order]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setWorking(next)
  }

  function remove(memberId: string) {
    setWorking(order.filter((e) => e.memberId !== memberId))
  }

  function add() {
    const m = addable.find((x) => x.id === toAdd)
    if (!m) return
    setWorking([
      ...order,
      { memberId: m.id, displayName: m.displayName, orderPosition: order.length },
    ])
    setToAdd('')
  }

  async function save() {
    setBusy(true)
    try {
      const res = await saveRotation(order.map((e, i) => ({ ...e, orderPosition: i })))
      showToast(
        res.ok
          ? { message: t('admin.saveSuccess'), variant: 'success' }
          : { message: res.message, variant: 'error' },
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">{t('admin.rotationHint')}</p>

      {order.length === 0 && <p className="text-sm text-muted">{t('admin.rotationEmpty')}</p>}

      <ol className="flex flex-col gap-2">
        {order.map((entry, i) => (
          <li key={entry.memberId}>
            <Card className="flex items-center gap-3">
              <span className="w-6 text-center font-bold text-muted">{i + 1}</span>
              <span className="flex-1 text-text">{entry.displayName}</span>
              <div className="flex gap-1">
                <Button
                  variant="icon"
                  size="sm"
                  aria-label={t('admin.moveUp')}
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="size-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5M5 12l7-7 7 7" />
                  </svg>
                </Button>
                <Button
                  variant="icon"
                  size="sm"
                  aria-label={t('admin.moveDown')}
                  disabled={i === order.length - 1}
                  onClick={() => move(i, 1)}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="size-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12l7 7 7-7" />
                  </svg>
                </Button>
                <Button
                  variant="icon"
                  size="sm"
                  className="text-danger"
                  aria-label={t('admin.rotationRemove')}
                  onClick={() => remove(entry.memberId)}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="size-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </Button>
              </div>
            </Card>
          </li>
        ))}
      </ol>

      {addable.length > 0 && (
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Select
              label={t('admin.rotationAdd')}
              placeholder={t('admin.rotationAddPlaceholder')}
              value={toAdd}
              onChange={(e) => setToAdd(e.target.value)}
              options={addable.map((m) => ({ value: m.id, label: m.displayName }))}
            />
          </div>
          <Button variant="secondary" onClick={add} disabled={!toAdd}>
            {t('common.add')}
          </Button>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={save} loading={busy}>
          {t('common.save')}
        </Button>
      </div>
    </div>
  )
}

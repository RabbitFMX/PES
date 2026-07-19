import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getActivities, getLogEntry, updateLogEntry } from '../lib/api'
import type { Activity, SavedLogEntry } from '../lib/types'
import { useToast } from '../context/toast'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Select } from './ui/Select'
import { Toggle } from './ui/Toggle'
import { Skeleton } from './ui/Skeleton'
import { ActivityScoring } from './ActivityScoring'

interface Props {
  entryId: string
  onClose: () => void
  /** Called with the member's new weekly total after a successful save. */
  onSaved: (weeklyPoints: number) => void
}

/**
 * Focused editor for one of the member's OWN current-week entries. Loads the
 * authoritative row (so the note and stroller flag survive an edit) and PATCHes
 * it; the backend recomputes points and enforces ownership + current-week.
 */
export function EditEntryModal({ entryId, onClose, onSaved }: Props) {
  const { t } = useTranslation()
  const { showToast } = useToast()

  const [entry, setEntry] = useState<SavedLogEntry | null>(null)
  const [activities, setActivities] = useState<Activity[] | null>(null)
  const [loadError, setLoadError] = useState(false)

  const [quantity, setQuantity] = useState('')
  const [elevation, setElevation] = useState('')
  const [stroller, setStroller] = useState(false)
  const [date, setDate] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    Promise.all([getLogEntry(entryId), getActivities()])
      .then(([e, acts]) => {
        if (!alive) return
        setEntry(e)
        setActivities(acts)
        setQuantity(String(e.quantity))
        setElevation(e.elevationM ? String(e.elevationM) : '')
        setStroller(e.withStroller)
        setDate(e.activityDate)
        setNote(e.note ?? '')
      })
      .catch(() => alive && setLoadError(true))
    return () => {
      alive = false
    }
  }, [entryId])

  const activity = entry?.activityId
    ? (activities?.find((a) => a.id === entry.activityId) ?? null)
    : null
  const isQuickAdd = entry != null && entry.activityId === null
  const qty = Number(quantity)
  const valid = entry != null && Number.isFinite(qty) && qty > 0

  async function save() {
    if (!entry || !valid) return
    setBusy(true)
    try {
      const input = isQuickAdd
        ? { points: qty, note: note || undefined }
        : {
            activityId: entry.activityId as string,
            quantity: qty,
            elevationM: elevation ? Number(elevation) : undefined,
            withStroller: stroller || undefined,
            activityDate: date,
            note: note || undefined,
          }
      const res = await updateLogEntry(entry.id, input)
      showToast({ message: t('overview.entryUpdated'), variant: 'success' })
      onSaved(res.weeklyPoints)
      onClose()
    } catch (err) {
      showToast({ message: (err as Error).message || t('common.loadError'), variant: 'error' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t('overview.editEntry')}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={save} loading={busy} disabled={!valid}>
            {t('common.save')}
          </Button>
        </div>
      }
    >
      {loadError ? (
        <p className="text-sm text-muted">{t('common.loadError')}</p>
      ) : !entry ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-10" />
          <Skeleton className="h-24" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {activity && <ActivityScoring activity={activity} />}

          {isQuickAdd ? (
            <Input
              label={t('logActivity.points')}
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              error={!valid ? t('logActivity.invalidValue') : undefined}
            />
          ) : activity?.isTiered && activity.tierOptions ? (
            <Select
              label={t('logActivity.presetValue')}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              options={activity.tierOptions.map((v) => ({ value: String(v), label: `${v} pts` }))}
            />
          ) : (
            <Input
              label={t('logActivity.quantity')}
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              unitSuffix={entry.unit}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              error={!valid ? t('logActivity.invalidValue') : undefined}
            />
          )}

          {activity?.hasElevationBonus && (
            <Input
              label={t('logActivity.elevation')}
              type="number"
              inputMode="numeric"
              min={0}
              value={elevation}
              onChange={(e) => setElevation(e.target.value)}
            />
          )}

          {activity?.hasStrollerOption && (
            <Toggle label={t('logActivity.stroller')} checked={stroller} onChange={setStroller} />
          )}

          {!isQuickAdd && (
            <Input
              label={t('logActivity.date')}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          )}

          <Input
            label={t('logActivity.note')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      )}
    </Modal>
  )
}

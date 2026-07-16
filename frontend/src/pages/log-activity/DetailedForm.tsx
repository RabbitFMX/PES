import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAsync } from '../../lib/useAsync'
import { getActivities, previewDetailed } from '../../lib/api'
import type { Activity, LogPreview } from '../../lib/types'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Toggle } from '../../components/ui/Toggle'
import { Skeleton } from '../../components/ui/Skeleton'
import { ActivityScoring } from '../../components/ActivityScoring'
import { ActivityPicker } from './ActivityPicker'

interface Props {
  onPreviews: (previews: LogPreview[], signature: string) => void
}

const today = () => new Date().toISOString().slice(0, 10)

export function DetailedForm({ onPreviews }: Props) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language.startsWith('en') ? 'en' : 'cs'
  const { data: activities, loading } = useAsync<Activity[]>(getActivities)

  const [activityId, setActivityId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [elevation, setElevation] = useState('')
  const [stroller, setStroller] = useState(false)
  const [date, setDate] = useState(today)
  const [note, setNote] = useState('')
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)

  if (loading || !activities) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10" />
        <Skeleton className="h-48" />
      </div>
    )
  }

  const activity = activities.find((a) => a.id === activityId) ?? null
  const qty = Number(quantity)
  const valid = activity != null && Number.isFinite(qty) && qty > 0

  async function submit() {
    setTouched(true)
    if (!valid || !activity) return
    setBusy(true)
    try {
      const preview = await previewDetailed({
        activityId: activity.id,
        quantity: qty,
        elevationM: elevation ? Number(elevation) : undefined,
        withStroller: stroller || undefined,
        activityDate: date,
        note: note || undefined,
      })
      onPreviews([preview], `${activity.id}|${qty}|${date}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <ActivityPicker
        activities={activities}
        value={activityId}
        onChange={setActivityId}
        lang={lang}
      />

      {activity && (
        <>
          <ActivityScoring activity={activity} />

          {activity.isTiered && activity.tierOptions ? (
            <Select
              label={t('logActivity.presetValue')}
              placeholder={t('logActivity.pickPreset')}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              options={activity.tierOptions.map((v) => ({ value: String(v), label: `${v} pts` }))}
              error={touched && !valid ? t('logActivity.invalidValue') : undefined}
            />
          ) : (
            <Input
              label={t('logActivity.quantity')}
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              unitSuffix={activity.unit}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              error={touched && !valid ? t('logActivity.invalidValue') : undefined}
            />
          )}

          {activity.hasElevationBonus && (
            <Input
              label={t('logActivity.elevation')}
              type="number"
              inputMode="numeric"
              min={0}
              value={elevation}
              onChange={(e) => setElevation(e.target.value)}
            />
          )}

          {activity.hasStrollerOption && (
            <Toggle label={t('logActivity.stroller')} checked={stroller} onChange={setStroller} />
          )}

          <Input
            label={t('logActivity.date')}
            type="date"
            value={date}
            max={today()}
            onChange={(e) => setDate(e.target.value)}
          />
          <Input
            label={t('logActivity.note')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </>
      )}

      <Button onClick={submit} loading={busy} disabled={!valid} fullWidth>
        {t('logActivity.preview')}
      </Button>
    </div>
  )
}

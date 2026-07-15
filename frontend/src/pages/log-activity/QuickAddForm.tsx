import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { previewQuickAdd } from '../../lib/api'
import type { LogPreview } from '../../lib/types'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

export function QuickAddForm({ onPreviews }: { onPreviews: (previews: LogPreview[]) => void }) {
  const { t } = useTranslation()
  const [points, setPoints] = useState('')
  const [note, setNote] = useState('')
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)

  const value = Number(points)
  const valid = Number.isFinite(value) && value > 0

  async function submit() {
    setTouched(true)
    if (!valid) return
    setBusy(true)
    try {
      const preview = await previewQuickAdd({ points: value, note: note || undefined })
      onPreviews([preview])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Input
        label={t('logActivity.points')}
        type="number"
        inputMode="decimal"
        min={0}
        step="any"
        unitSuffix="pts"
        value={points}
        onChange={(e) => setPoints(e.target.value)}
        error={touched && !valid ? t('logActivity.invalidValue') : undefined}
      />
      <Input label={t('logActivity.note')} value={note} onChange={(e) => setNote(e.target.value)} />
      <Button onClick={submit} loading={busy} disabled={!valid} fullWidth>
        {t('logActivity.preview')}
      </Button>
    </div>
  )
}

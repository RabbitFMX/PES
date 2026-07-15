import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAsync } from '../../lib/useAsync'
import { getAdminActivities, saveActivity } from '../../lib/api'
import type { Activity } from '../../lib/types'
import { useToast } from '../../context/toast'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Toggle } from '../../components/ui/Toggle'
import { Modal } from '../../components/ui/Modal'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/ErrorState'

export function ActivitiesPanel() {
  const { t } = useTranslation()
  const { data, loading, error, reload } = useAsync<Activity[]>(getAdminActivities)
  const [editing, setEditing] = useState<Activity | null>(null)

  if (loading) return <Skeleton className="h-64" />
  if (error || !data) return <ErrorState onRetry={reload} />

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-[var(--radius-md)] ring-1 ring-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="px-3 py-2 font-medium">{t('admin.activityCs')}</th>
              <th className="px-3 py-2 font-medium">{t('admin.activityEn')}</th>
              <th className="px-3 py-2 font-medium">{t('admin.unit')}</th>
              <th className="px-3 py-2 font-medium">{t('admin.rate')}</th>
              <th className="px-3 py-2 font-medium">{t('admin.active')}</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {data.map((act) => (
              <tr key={act.id} className="border-b border-border last:border-0">
                <td className="px-3 py-2 font-medium text-text">{act.nameCs}</td>
                <td className="px-3 py-2 text-muted">{act.nameEn}</td>
                <td className="px-3 py-2">{act.unit}</td>
                <td className="px-3 py-2">
                  {act.isTiered ? act.tierOptions?.join(' / ') : act.pointsPerUnit}
                </td>
                <td className="px-3 py-2">
                  {act.active ? (
                    <Badge variant="success">✓</Badge>
                  ) : (
                    <Badge variant="neutral">—</Badge>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(act)}>
                    {t('admin.edit')}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditActivityModal activity={editing} onClose={() => setEditing(null)} onSaved={reload} />
      )}
    </div>
  )
}

function EditActivityModal({
  activity,
  onClose,
  onSaved,
}: {
  activity: Activity
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const [form, setForm] = useState<Activity>(activity)
  const [tiers, setTiers] = useState((activity.tierOptions ?? []).join(', '))
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)

  const parsedTiers = tiers
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0)

  const namesValid = form.nameCs.trim() !== '' && form.nameEn.trim() !== ''
  const tiersValid = !form.isTiered || parsedTiers.length > 0
  const valid = namesValid && tiersValid

  async function save() {
    setTouched(true)
    if (!valid) return
    setBusy(true)
    try {
      const res = await saveActivity({
        ...form,
        tierOptions: form.isTiered ? parsedTiers : null,
      })
      if (res.ok) {
        showToast({ message: t('admin.saveSuccess'), variant: 'success' })
        onClose()
        onSaved()
      } else {
        showToast({ message: res.message, variant: 'error' })
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={activity.nameCs}
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} fullWidth>
            {t('common.cancel')}
          </Button>
          <Button onClick={save} loading={busy} disabled={!valid} fullWidth>
            {t('common.save')}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <Input
          label={t('admin.activityCs')}
          value={form.nameCs}
          onChange={(e) => setForm({ ...form, nameCs: e.target.value })}
          error={touched && !form.nameCs.trim() ? t('logActivity.invalidValue') : undefined}
        />
        <Input
          label={t('admin.activityEn')}
          value={form.nameEn}
          onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
          error={touched && !form.nameEn.trim() ? t('logActivity.invalidValue') : undefined}
        />
        <Input
          label={t('admin.unit')}
          value={form.unit}
          onChange={(e) => setForm({ ...form, unit: e.target.value })}
        />
        {form.isTiered ? (
          <Input
            label={t('admin.tiered')}
            value={tiers}
            hint="5, 10, 15, 30"
            onChange={(e) => setTiers(e.target.value)}
            error={touched && !tiersValid ? t('logActivity.invalidValue') : undefined}
          />
        ) : (
          <>
            <Input
              label={t('admin.rate')}
              type="number"
              step="any"
              value={String(form.pointsPerUnit)}
              onChange={(e) => setForm({ ...form, pointsPerUnit: Number(e.target.value) })}
            />
            {form.hasElevationBonus && (
              <Input
                label={t('admin.elevationBonus')}
                type="number"
                step="any"
                value={String(form.elevationBonusPer50m ?? 0)}
                onChange={(e) => setForm({ ...form, elevationBonusPer50m: Number(e.target.value) })}
              />
            )}
          </>
        )}
        <Toggle
          label={t('admin.active')}
          checked={form.active}
          onChange={(v) => setForm({ ...form, active: v })}
        />
      </div>
    </Modal>
  )
}

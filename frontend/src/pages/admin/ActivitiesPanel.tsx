import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAsync } from '../../lib/useAsync'
import { createActivity, deleteActivity, getAdminActivities, saveActivity } from '../../lib/api'
import type { Activity } from '../../lib/types'
import { useToast } from '../../context/toast'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Toggle } from '../../components/ui/Toggle'
import { Modal } from '../../components/ui/Modal'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/ErrorState'

/** A blank activity used to seed the "add activity" form. */
const BLANK_ACTIVITY: Activity = {
  id: '',
  nameCs: '',
  nameEn: '',
  unit: '',
  pointsPerUnit: 0,
  hasElevationBonus: false,
  elevationBonusPer50m: null,
  elevationBonusPer50mStroller: null,
  hasStrollerOption: false,
  strollerBaseRateOverride: null,
  isTiered: false,
  tierOptions: null,
  notes: null,
  active: true,
}

export function ActivitiesPanel() {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const { data, loading, error, reload } = useAsync<Activity[]>(getAdminActivities)
  const [editing, setEditing] = useState<Activity | null>(null)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  if (loading) return <Skeleton className="h-64" />
  if (error || !data) return <ErrorState onRetry={reload} />

  async function remove(act: Activity) {
    if (!window.confirm(t('admin.confirmDeleteActivity', { name: act.nameCs }))) return
    setDeletingId(act.id)
    try {
      const res = await deleteActivity(act.id)
      if (res.ok) {
        showToast({ message: t('admin.deleteSuccess'), variant: 'success' })
        reload()
      } else if (res.message === 'in_use') {
        showToast({ message: t('admin.deleteInUse'), variant: 'error' })
      } else {
        showToast({ message: res.message ?? t('common.loadError'), variant: 'error' })
      }
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setCreating(true)}>
          {t('admin.addActivity')}
        </Button>
      </div>

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
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(act)}>
                      {t('admin.edit')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-danger"
                      disabled={deletingId === act.id}
                      onClick={() => remove(act)}
                    >
                      {t('admin.delete')}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <ActivityModal
          mode="edit"
          activity={editing}
          onClose={() => setEditing(null)}
          onSaved={reload}
        />
      )}
      {creating && (
        <ActivityModal
          mode="create"
          activity={BLANK_ACTIVITY}
          onClose={() => setCreating(false)}
          onSaved={reload}
        />
      )}
    </div>
  )
}

/** Create/edit form for a rate-table activity, covering every scoring field. */
function ActivityModal({
  mode,
  activity,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'edit'
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

  const set = <K extends keyof Activity>(key: K, value: Activity[K]) =>
    setForm((f) => ({ ...f, [key]: value }))
  /** Number input → number, or null when cleared. */
  const numOrNull = (s: string): number | null => (s.trim() === '' ? null : Number(s))

  const parsedTiers = tiers
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0)

  const idValid = mode === 'edit' || /^[a-z0-9-]+$/.test(form.id.trim())
  const namesValid = form.nameCs.trim() !== '' && form.nameEn.trim() !== ''
  const tiersValid = !form.isTiered || parsedTiers.length > 0
  const valid = idValid && namesValid && tiersValid && form.unit.trim() !== ''

  async function save() {
    setTouched(true)
    if (!valid) return
    setBusy(true)
    try {
      const payload: Activity = { ...form, tierOptions: form.isTiered ? parsedTiers : null }
      const res = mode === 'create' ? await createActivity(payload) : await saveActivity(payload)
      if (res.ok) {
        showToast({
          message: res.warning ?? t('admin.saveSuccess'),
          variant: res.warning ? 'info' : 'success',
        })
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
      title={mode === 'create' ? t('admin.newActivity') : activity.nameCs}
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
        {mode === 'create' && (
          <Input
            label={t('admin.activityId')}
            hint={t('admin.activityIdHint')}
            value={form.id}
            onChange={(e) => set('id', e.target.value)}
            error={touched && !idValid ? t('admin.activityIdInvalid') : undefined}
          />
        )}
        <Input
          label={t('admin.activityCs')}
          value={form.nameCs}
          onChange={(e) => set('nameCs', e.target.value)}
          error={touched && !form.nameCs.trim() ? t('logActivity.invalidValue') : undefined}
        />
        <Input
          label={t('admin.activityEn')}
          value={form.nameEn}
          onChange={(e) => set('nameEn', e.target.value)}
          error={touched && !form.nameEn.trim() ? t('logActivity.invalidValue') : undefined}
        />
        <Input
          label={t('admin.unit')}
          value={form.unit}
          onChange={(e) => set('unit', e.target.value)}
          error={touched && form.unit.trim() === '' ? t('logActivity.invalidValue') : undefined}
        />

        <Toggle
          label={t('admin.isTiered')}
          checked={form.isTiered}
          onChange={(v) => set('isTiered', v)}
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
              onChange={(e) => set('pointsPerUnit', Number(e.target.value))}
            />

            <Toggle
              label={t('admin.hasElevation')}
              checked={form.hasElevationBonus}
              onChange={(v) => set('hasElevationBonus', v)}
            />
            {form.hasElevationBonus && (
              <>
                <Input
                  label={t('admin.elevationBonus')}
                  type="number"
                  step="any"
                  value={form.elevationBonusPer50m == null ? '' : String(form.elevationBonusPer50m)}
                  onChange={(e) => set('elevationBonusPer50m', numOrNull(e.target.value))}
                />
                <Input
                  label={t('admin.elevationBonusStroller')}
                  type="number"
                  step="any"
                  value={
                    form.elevationBonusPer50mStroller == null
                      ? ''
                      : String(form.elevationBonusPer50mStroller)
                  }
                  onChange={(e) => set('elevationBonusPer50mStroller', numOrNull(e.target.value))}
                />
              </>
            )}

            <Toggle
              label={t('admin.hasStroller')}
              checked={form.hasStrollerOption}
              onChange={(v) => set('hasStrollerOption', v)}
            />
            {form.hasStrollerOption && (
              <Input
                label={t('admin.strollerOverride')}
                hint={t('admin.strollerOverrideHint')}
                type="number"
                step="any"
                value={
                  form.strollerBaseRateOverride == null ? '' : String(form.strollerBaseRateOverride)
                }
                onChange={(e) => set('strollerBaseRateOverride', numOrNull(e.target.value))}
              />
            )}
          </>
        )}

        <Input
          label={t('admin.notes')}
          value={form.notes ?? ''}
          onChange={(e) => set('notes', e.target.value || null)}
        />
        <Toggle
          label={t('admin.active')}
          checked={form.active}
          onChange={(v) => set('active', v)}
        />
      </div>
    </Modal>
  )
}

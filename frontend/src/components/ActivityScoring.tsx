import { useTranslation } from 'react-i18next'
import type { Activity } from '../lib/types'

/**
 * Explains how an activity earns points (the "scoring philosophy"): base rate,
 * elevation bonus, stroller handling, or preset tiers. Rendered from the
 * Activity fields the rate table already exposes — no backend call needed.
 * The compact `shortRate` helper lives in lib/activityScoring.
 */

export function ActivityScoring({ activity }: { activity: Activity }) {
  const { t } = useTranslation()
  const pts = t('logActivity.scoring.pts')
  const chips: string[] = []

  if (activity.isTiered && activity.tierOptions?.length) {
    chips.push(`${activity.tierOptions.join(' / ')} ${pts}`)
  } else {
    chips.push(`${activity.pointsPerUnit} ${pts} / ${activity.unit}`)
  }
  if (activity.hasElevationBonus && activity.elevationBonusPer50m != null) {
    chips.push(`↑ +${activity.elevationBonusPer50m} ${pts} / 50 m`)
    if (activity.elevationBonusPer50mStroller != null) {
      chips.push(`🍼 ↑ +${activity.elevationBonusPer50mStroller} ${pts} / 50 m`)
    }
  }
  if (activity.hasStrollerOption && activity.strollerBaseRateOverride != null) {
    chips.push(`🍼 ${activity.strollerBaseRateOverride} ${pts} / ${activity.unit}`)
  }

  return (
    <div className="rounded-[var(--radius-sm)] bg-secondary/5 p-3 ring-1 ring-border">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted uppercase">
        <span aria-hidden="true">🐾</span>
        {t('logActivity.scoring.howItScores')}
      </div>
      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <span
            key={c}
            className="rounded-full bg-surface px-2.5 py-1 text-sm font-medium text-text tabular-nums ring-1 ring-border"
          >
            {c}
          </span>
        ))}
      </div>
    </div>
  )
}

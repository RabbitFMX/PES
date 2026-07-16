import type { Activity } from './types'

/** Compact scoring one-liner for list rows, e.g. "3 b/km ↑" or "5–30 b". */
export function shortRate(a: Activity, pts: string): string {
  if (a.isTiered && a.tierOptions && a.tierOptions.length) {
    const min = Math.min(...a.tierOptions)
    const max = Math.max(...a.tierOptions)
    return `${min}–${max} ${pts}`
  }
  const base = `${a.pointsPerUnit} ${pts}/${a.unit}`
  return a.hasElevationBonus ? `${base} ↑` : base
}

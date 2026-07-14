import type { Activity } from './types'

/**
 * Mock-side points calculation mirroring project-brief.md §13/§14. Lives in the
 * mock "backend" layer — the real app will compute this server-side. Kept
 * pure and separately tested because the per-activity elevation/stroller/tier
 * rules are easy to get subtly wrong.
 */
export function computeRawPoints(
  activity: Activity,
  quantity: number,
  elevationM = 0,
  withStroller = false,
): number {
  if (activity.isTiered) {
    // Tiered activities: `quantity` is the chosen preset point value itself.
    return round2(quantity)
  }

  // Base rate can be overridden when a stroller is used (e.g. túra 1.5→2 b/km).
  const baseRate =
    withStroller && activity.strollerBaseRateOverride != null
      ? activity.strollerBaseRateOverride
      : activity.pointsPerUnit

  let raw = quantity * baseRate

  if (activity.hasElevationBonus && elevationM > 0) {
    const per50 =
      withStroller && activity.elevationBonusPer50mStroller != null
        ? activity.elevationBonusPer50mStroller
        : (activity.elevationBonusPer50m ?? 0)
    raw += (elevationM / 50) * per50
  }

  return round2(raw)
}

export function applyCoefficient(rawPoints: number, coefficient: number): number {
  return round2(rawPoints * coefficient)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

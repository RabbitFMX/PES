import type { Activity } from '../schemas/activity'

/**
 * Server-side points calculation — the authoritative version of the rules the
 * frontend mocks in `frontend/src/lib/mockPoints.ts` (project-brief §13/§14).
 * The client is never trusted with points: every preview and commit recomputes
 * here. Kept pure (no DB, no Express) so the per-activity
 * elevation/stroller/tier rules are exhaustively unit-testable.
 */

/** Round to 2 decimal places (points are shown to two decimals). */
export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Raw points for a detailed-mode entry, before the fenčí koeficient.
 *
 * - Tiered activities: `quantity` IS the chosen preset point value — passthrough.
 * - Base rate uses `strollerBaseRateOverride` when a stroller is used and an
 *   override exists (e.g. túra 1.5→2 b/km); otherwise `pointsPerUnit`.
 * - Elevation bonus uses the stroller-specific per-50 m rate when a stroller is
 *   used and that rate exists; otherwise the plain per-50 m rate.
 */
export function computeRawPoints(
  activity: Activity,
  quantity: number,
  elevationM = 0,
  withStroller = false,
): number {
  if (activity.isTiered) {
    return round2(quantity)
  }

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

/**
 * Applies the fenčí koeficient (1.0 or 1.25) to raw points.
 * Kept separate from raw_points so the app can show "24 ×1.25 = 30"
 * and recompute if a member's coefficient changes (brief §13). The ×1.25
 * applies to quick-add entries too (§25).
 */
export function applyCoefficient(rawPoints: number, coefficient: number): number {
  return round2(rawPoints * coefficient)
}

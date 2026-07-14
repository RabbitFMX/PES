/**
 * Applies the fenčí koeficient (1.0 or 1.25) to raw points.
 * Kept separate from raw_points so the app can show "24 ×1.25 = 30"
 * and recompute if a member's coefficient changes (brief §13).
 */
export function applyCoefficient(rawPoints: number, coefficient: number): number {
  return Math.round(rawPoints * coefficient * 100) / 100
}

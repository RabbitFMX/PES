/**
 * Small presentation helpers. Locale-aware where it matters; kept pure and
 * dependency-free so they are trivial to unit-test.
 */

/** Format a point value: drop trailing .0, keep up to 2 decimals otherwise. */
export function formatPoints(points: number): string {
  return Number.isInteger(points) ? String(points) : String(Math.round(points * 100) / 100)
}

/** Clamp a 0..100+ weekly total to a 0..1 ring fraction (overflow allowed to show >100). */
export function goalFraction(points: number, goal: number): number {
  if (goal <= 0) return 0
  return Math.max(0, points / goal)
}

/** Ordinal suffix for a rank, English-only (used for vanity "2nd" labels). */
export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0])
}

/** Localised short date from an ISO string. */
export function formatDate(iso: string, locale: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(locale === 'cs' ? 'cs-CZ' : 'en-GB', {
    day: 'numeric',
    month: 'short',
  })
}

import type { MemberStatEntry } from '../db/logEntries'

/**
 * Deterministic test-data generation.
 *
 * The app stores historical weekly results as quick-add log entries (one row per
 * member per week, `activity_id = null`), so the DETAILED, per-activity stats are
 * empty for imported history. These pure helpers expand a member's real weekly
 * total into a plausible set of per-activity entries whose `finalPoints` sum
 * EXACTLY back to that total. That keeps every points-based figure (weekly/round/
 * lifetime totals, ranks, streaks) identical while filling the detail-only charts
 * (distance/elevation by activity, points by day, strongest activities, …).
 *
 * Everything is seeded from stable ids (member + week + index), so the same
 * request always yields the same data — no `Math.random`, no timestamps.
 */

/** Activity metadata the generator distributes points across. */
export interface ActivityMeta {
  id: string
  unit: string
  pointsPerUnit: number
  nameCs: string
  nameEn: string
  hasElevationBonus: boolean
}

/** A generated detailed entry — shape-compatible with MemberStatEntry. */
export type GeneratedEntry = MemberStatEntry & { activityId: string }

/** Per-member, per-activity points row (shape of listDetailedActivityPoints). */
export interface GeneratedActivityPoints {
  member_id: string
  activity_id: string
  name_cs: string
  name_en: string
  final_points: number
}

/** FNV-1a 32-bit hash of a string → unsigned int seed. */
export function hashSeed(input: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** mulberry32 PRNG — tiny, deterministic, good enough for seeding test data. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** ISO `YYYY-MM-DD` offset by `n` days. */
function addDaysIso(dateIso: string, n: number): string {
  const d = new Date(`${dateIso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Split `totalCents` into `parts` positive integers that sum EXACTLY to it.
 * Weights come from the rng so the split looks varied but stays deterministic.
 * If there are more parts than cents, empty parts are dropped by the caller.
 */
export function splitCents(totalCents: number, parts: number, rng: () => number): number[] {
  if (parts <= 1 || totalCents <= 0) return [Math.max(0, totalCents)]
  const weights = Array.from({ length: parts }, () => rng() + 0.15)
  const sum = weights.reduce((s, w) => s + w, 0)
  const out = weights.map((w) => Math.floor((w / sum) * totalCents))
  // Hand the rounding remainder to the largest bucket so the sum is exact.
  let remainder = totalCents - out.reduce((s, v) => s + v, 0)
  while (remainder > 0) {
    let maxIdx = 0
    for (let i = 1; i < out.length; i++) if (out[i] > out[maxIdx]) maxIdx = i
    out[maxIdx] += 1
    remainder -= 1
  }
  return out
}

/** Derive a plausible logged quantity from a point value for one activity. */
function quantityFor(activity: ActivityMeta, points: number): number {
  if (activity.pointsPerUnit > 0) {
    // e.g. run 3 b/km, 30 pts → 10 km; keep 1 decimal for distance-like units.
    return Math.max(1, round2(points / activity.pointsPerUnit))
  }
  // Tiered activities (pointsPerUnit 0): the logged value IS the point value.
  return Math.max(1, Math.round(points))
}

/** Plausible elevation (m) for an elevation-bonus activity, else 0. */
function elevationFor(activity: ActivityMeta, points: number, rng: () => number): number {
  if (!activity.hasElevationBonus || activity.unit !== 'km') return 0
  return Math.round(points * (2 + rng() * 6)) // ~2–8 m per point
}

/**
 * Expand one week's total into detailed entries summing exactly to it.
 * `week` carries the metadata copied onto every generated entry.
 */
export function generateWeekEntries(
  week: { weekId: string; weekStartDate: string; weekNumber: number; roundId: string },
  totalPoints: number,
  activities: ActivityMeta[],
  memberId: string,
): GeneratedEntry[] {
  const totalCents = Math.round(totalPoints * 100)
  if (totalCents <= 0 || activities.length === 0) return []

  const rng = mulberry32(hashSeed(`${memberId}|${week.weekId}`))
  const sessions = 3 + Math.floor(rng() * 4) // 3–6 sessions per week
  const cents = splitCents(totalCents, sessions, rng).filter((c) => c > 0)

  return cents.map((c) => {
    const activity = activities[Math.floor(rng() * activities.length)]
    const dayOffset = Math.floor(rng() * 7)
    const points = c / 100
    return {
      id: null, // synthesized test-data entries are not real rows → not editable
      activityDate: addDaysIso(week.weekStartDate, dayOffset),
      quantity: quantityFor(activity, points),
      unit: activity.unit,
      elevationM: elevationFor(activity, points, rng),
      withStroller: false,
      finalPoints: round2(points),
      weekId: week.weekId,
      weekStartDate: week.weekStartDate,
      weekNumber: week.weekNumber,
      roundId: week.roundId,
      activityId: activity.id,
      activityNameCs: activity.nameCs,
      activityNameEn: activity.nameEn,
    }
  })
}

/**
 * Replace a member's real entries with generated detailed ones. Per-week totals
 * (summed from ALL real entries, detailed + quick-add) are preserved exactly;
 * each week is re-expanded into per-activity/day detail.
 */
export function generateMemberDetailedEntries(
  realEntries: MemberStatEntry[],
  activities: ActivityMeta[],
): GeneratedEntry[] {
  const byWeek = new Map<
    string,
    { weekStartDate: string; weekNumber: number; roundId: string; total: number }
  >()
  for (const e of realEntries) {
    const cur = byWeek.get(e.weekId) ?? {
      weekStartDate: e.weekStartDate,
      weekNumber: e.weekNumber,
      roundId: e.roundId,
      total: 0,
    }
    cur.total += e.finalPoints
    byWeek.set(e.weekId, cur)
  }

  const out: GeneratedEntry[] = []
  for (const [weekId, w] of byWeek) {
    out.push(
      ...generateWeekEntries(
        { weekId, weekStartDate: w.weekStartDate, weekNumber: w.weekNumber, roundId: w.roundId },
        round2(w.total),
        activities,
        // memberId is not on MemberStatEntry; the weekId already namespaces the
        // seed per member (weeks are member-agnostic but totals differ), so mix
        // the total in to keep members' distributions distinct.
        `${weekId}:${Math.round(w.total * 100)}`,
      ),
    )
  }
  return out
}

/**
 * Distribute a member's lifetime total across a handful of activities, summing
 * exactly to the total — feeds the pack-wide "strongest activities".
 */
export function generateActivityPoints(
  memberId: string,
  totalPoints: number,
  activities: ActivityMeta[],
): GeneratedActivityPoints[] {
  const totalCents = Math.round(totalPoints * 100)
  if (totalCents <= 0 || activities.length === 0) return []

  const rng = mulberry32(hashSeed(`acts|${memberId}`))
  const count = Math.min(activities.length, 4 + Math.floor(rng() * 3)) // 4–6 activities
  // Pick `count` distinct activities deterministically.
  const pool = activities.map((a, i) => ({ a, k: (hashSeed(`${memberId}|${a.id}`) + i) >>> 0 }))
  pool.sort((x, y) => x.k - y.k)
  const chosen = pool.slice(0, count).map((p) => p.a)

  const cents = splitCents(totalCents, chosen.length, rng)
  return chosen
    .map((activity, i) => ({
      member_id: memberId,
      activity_id: activity.id,
      name_cs: activity.nameCs,
      name_en: activity.nameEn,
      final_points: round2(cents[i] / 100),
    }))
    .filter((r) => r.final_points > 0)
}

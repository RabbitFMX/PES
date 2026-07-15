import { listRoundEntries, listMemberEntriesDetailed } from '../db/logEntries'
import type { MemberStatEntry } from '../db/logEntries'
import { listActiveMembers } from '../db/members'
import { getOpenRound, listAllMemberRoundDivisions, listRounds } from '../db/rounds'
import { getCurrentWeek, listWeeks } from '../db/weeks'
import type { MemberRow } from '../db/types'
import { DAYS_OF_WEEK, statsDataSchema, type StatsData } from '../schemas/stats'
import { rankStandings, WEEKLY_GOAL } from './standings'

/**
 * My-Stats logic (chunk 9): a member's long-term records and behavioural
 * patterns. Everything is derived at query time. The lifetime aggregates come
 * from ONE indexed query (`listMemberEntriesDetailed`, on
 * `log_entry_member_id_idx`); if these ever get hot, this service function is
 * where a per-(memberId, roundId) cache would sit.
 *
 * Scope of each field (documented so the frontend and later chunks agree):
 * - records + pointsByDayOfWeek + routineDetected → lifetime (all rounds).
 * - pointsOverTime → the selected round (`roundId`, default the open round).
 * - currentWeekByDay → the current open week.
 * The pure helpers below are unit-tested in isolation.
 */

/** Round to 2 decimals (points are stored to 2 dp; JS sums can drift). */
function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** ISO `YYYY-MM-DD` for a date string offset by `n` days. */
function addDays(dateIso: string, n: number): string {
  const d = new Date(`${dateIso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Mon-first day-of-week index (0 = Mon … 6 = Sun) for an ISO date. */
function dayIndex(dateIso: string): number {
  return (new Date(`${dateIso}T00:00:00Z`).getUTCDay() + 6) % 7
}

/** Ordinal string: 1 → "1st", 2 → "2nd", 3 → "3rd", 4 → "4th", 11 → "11th". */
export function ordinal(n: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${suffixes[(v - 20) % 10] ?? suffixes[v] ?? suffixes[0]}`
}

/** Sum points into the Mon–Sun buckets the frontend charts expect. */
export function pointsByDay(entries: { date: string; points: number }[]): {
  day: string
  points: number
}[] {
  const totals = DAYS_OF_WEEK.map(() => 0)
  for (const e of entries) totals[dayIndex(e.date)] += e.points
  return DAYS_OF_WEEK.map((day, i) => ({ day, points: round2(totals[i]) }))
}

/**
 * Longest run of consecutive weeks at or above the goal. `weekTotals` is the
 * member's per-week totals in chronological order, with 0 for weeks not logged
 * (so a gap correctly breaks the run). Reuses the ≥-goal rule from chunk 7.
 */
export function longestStreakWeeks(weekTotals: number[], goal: number = WEEKLY_GOAL): number {
  let best = 0
  let run = 0
  for (const total of weekTotals) {
    run = total >= goal ? run + 1 : 0
    if (run > best) best = run
  }
  return best
}

/**
 * The member's most-done activity by entry count, ties broken by total points,
 * then by name for determinism. Entries with no activity (quick-add) are
 * ignored. Returns null when there is nothing named to rank.
 */
export function favouriteActivity(
  entries: { activityName: string | null; points: number }[],
): string | null {
  const byName = new Map<string, { count: number; points: number }>()
  for (const e of entries) {
    if (!e.activityName) continue
    const cur = byName.get(e.activityName) ?? { count: 0, points: 0 }
    cur.count += 1
    cur.points += e.points
    byName.set(e.activityName, cur)
  }
  if (byName.size === 0) return null

  return [...byName.entries()].sort(
    (a, b) => b[1].count - a[1].count || b[1].points - a[1].points || a[0].localeCompare(b[0]),
  )[0][0]
}

/**
 * Simple routine heuristic: the activity logged on the most distinct days
 * within the last `windowDays` (default 21), reported when that count reaches
 * `minDays` (default 12 — roughly four sessions a week). Returns e.g.
 * "kliky 18 of the last 21 days", or null when no habit is strong enough.
 */
export function detectRoutine(
  entries: { activityName: string | null; date: string }[],
  today: string,
  windowDays = 21,
  minDays = 12,
): string | null {
  const windowStart = addDays(today, -(windowDays - 1))
  const daysByName = new Map<string, Set<string>>()
  for (const e of entries) {
    if (!e.activityName) continue
    if (e.date < windowStart || e.date > today) continue
    const days = daysByName.get(e.activityName) ?? new Set<string>()
    days.add(e.date)
    daysByName.set(e.activityName, days)
  }
  if (daysByName.size === 0) return null

  const [name, days] = [...daysByName.entries()].sort(
    (a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0]),
  )[0]
  return days.size >= minDays ? `${name} ${days.size} of the last ${windowDays} days` : null
}

/** Today as an ISO `YYYY-MM-DD` string. */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * The member's best (lowest) finishing rank across finished (closed) rounds,
 * ranked within their division **for that round** (`member_round_division`,
 * §25), formatted "2nd, Pack A". Null when they finished no closed round.
 */
async function computeBestRoundFinish(
  member: MemberRow,
  allWeekRounds: Map<string, string>,
): Promise<string | null> {
  const rounds = await listRounds()
  const closed = rounds.filter((r) => r.status === 'closed')
  if (closed.length === 0) return null

  const closedIds = new Set(closed.map((r) => r.id))
  const closedWeekIds = [...allWeekRounds.entries()]
    .filter(([, roundId]) => closedIds.has(roundId))
    .map(([weekId]) => weekId)
  if (closedWeekIds.length === 0) return null

  const [entries, allMrd, activeMembers] = await Promise.all([
    listRoundEntries(closedWeekIds),
    listAllMemberRoundDivisions(),
    listActiveMembers(),
  ])

  // Per-round, per-member totals; and division lookups.
  const totalsByRound = new Map<string, Map<string, number>>()
  for (const e of entries) {
    const roundId = allWeekRounds.get(e.week_id)
    if (!roundId) continue
    const perMember = totalsByRound.get(roundId) ?? new Map<string, number>()
    perMember.set(e.member_id, (perMember.get(e.member_id) ?? 0) + e.final_points)
    totalsByRound.set(roundId, perMember)
  }
  const mrdOf = new Map(allMrd.map((d) => [`${d.member_id}|${d.round_id}`, d.division]))
  const currentDivOf = new Map(activeMembers.map((m) => [m.id, m.division]))
  const divisionOf = (memberId: string, roundId: string): 'A' | 'B' | null =>
    mrdOf.get(`${memberId}|${roundId}`) ?? currentDivOf.get(memberId) ?? null

  let best: { rank: number; division: 'A' | 'B' } | null = null
  for (const round of closed) {
    const totals = totalsByRound.get(round.id)
    if (!totals || !totals.has(member.id)) continue // member did not participate
    const myDivision = divisionOf(member.id, round.id) ?? member.division
    const inputs = [...totals.entries()]
      .filter(([mid]) => divisionOf(mid, round.id) === myDivision)
      .map(([mid, total]) => ({ memberId: mid, roundTotal: round2(total) }))
    const rank = rankStandings(inputs).find((s) => s.memberId === member.id)?.rank
    if (rank !== undefined && (best === null || rank < best.rank)) {
      best = { rank, division: myDivision }
    }
  }

  return best ? `${ordinal(best.rank)}, Pack ${best.division}` : null
}

/** Pick the activity name in the member's preferred language. */
function nameFor(entry: MemberStatEntry, lang: 'cs' | 'en'): string | null {
  return lang === 'en' ? entry.activityNameEn : entry.activityNameCs
}

export async function getStats(member: MemberRow, roundId?: string): Promise<StatsData> {
  const today = todayIso()
  const openRound = await getOpenRound()
  const effectiveRoundId = roundId ?? openRound?.id ?? null

  const [entries, weeks, currentWeek] = await Promise.all([
    listMemberEntriesDetailed(member.id),
    listWeeks(),
    getCurrentWeek(today),
  ])

  // Per-week totals (weeks the member logged); chronological zero-filled series.
  const weekTotal = new Map<string, number>()
  for (const e of entries) weekTotal.set(e.weekId, (weekTotal.get(e.weekId) ?? 0) + e.finalPoints)
  const chronoTotals = weeks.map((w) => weekTotal.get(w.id) ?? 0)

  const lifetimePoints = round2(entries.reduce((s, e) => s + e.finalPoints, 0))
  const totalKmAllTime = round2(
    entries.filter((e) => e.unit === 'km').reduce((s, e) => s + e.quantity, 0),
  )
  const bestWeek = round2(Math.max(0, ...chronoTotals))
  const weeksAtGoal = chronoTotals.filter((t) => t >= WEEKLY_GOAL).length
  const longest = longestStreakWeeks(chronoTotals)

  const lang = member.language_pref
  const favourite =
    favouriteActivity(
      entries.map((e) => ({ activityName: nameFor(e, lang), points: e.finalPoints })),
    ) ?? '—'

  const allWeekRounds = new Map(weeks.map((w) => [w.id, w.round_id]))
  const bestRoundFinish = (await computeBestRoundFinish(member, allWeekRounds)) ?? '—'

  // Selected-round weekly line (zero-filled for a continuous chart).
  const pointsOverTime = weeks
    .filter((w) => w.round_id === effectiveRoundId)
    .map((w) => ({ date: w.start_date, points: round2(weekTotal.get(w.id) ?? 0) }))

  const pointsByDayOfWeek = pointsByDay(
    entries.map((e) => ({ date: e.activityDate, points: e.finalPoints })),
  )

  const currentWeekEntries = currentWeek ? entries.filter((e) => e.weekId === currentWeek.id) : []
  const currentWeekByDay = pointsByDay(
    currentWeekEntries.map((e) => ({ date: e.activityDate, points: e.finalPoints })),
  )

  const routineDetected = detectRoutine(
    entries.map((e) => ({ activityName: nameFor(e, lang), date: e.activityDate })),
    today,
  )

  return statsDataSchema.parse({
    records: {
      bestWeek,
      bestRoundFinish,
      favouriteActivity: favourite,
      lifetimePoints,
      longestStreakWeeks: longest,
      totalKmAllTime,
      weeksAtGoal,
    },
    pointsOverTime,
    pointsByDayOfWeek,
    routineDetected,
    currentWeekByDay,
  })
}

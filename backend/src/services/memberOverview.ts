import { HttpError } from '../middleware/errorHandler'
import { getMemberById, listAllMembers } from '../db/members'
import { listMemberEntriesDetailed, listRoundEntries } from '../db/logEntries'
import type { MemberStatEntry } from '../db/logEntries'
import { listRounds } from '../db/rounds'
import { getCurrentWeek, listWeeks } from '../db/weeks'
import {
  memberDirectoryEntrySchema,
  memberOverviewSchema,
  type MemberDirectoryEntry,
  type MemberOverview,
} from '../schemas/memberOverview'
import { WEEKLY_GOAL } from './standings'
import { computeStreak } from './dashboard'
import { favouriteActivity, longestStreakWeeks, pointsByDay } from './stats'

/**
 * Personal overview (Přehled tab + read-only member pages). Points-based fields
 * cover all members (incl. imported history); distance/elevation come only from
 * DETAILED entries (activity_id present) since the import is weekly totals.
 */

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}
function nameFor(e: MemberStatEntry, lang: 'cs' | 'en'): string | null {
  return lang === 'en' ? e.activityNameEn : e.activityNameCs
}

/** Directory of all members (view-others entry point), ranked by lifetime points. */
export async function listMembersDirectory(): Promise<MemberDirectoryEntry[]> {
  const [members, weeks] = await Promise.all([listAllMembers(), listWeeks()])
  const entries = await listRoundEntries(weeks.map((w) => w.id))
  const pts = new Map<string, number>()
  for (const e of entries) pts.set(e.member_id, (pts.get(e.member_id) ?? 0) + e.final_points)

  return members
    .map((m) =>
      memberDirectoryEntrySchema.parse({
        id: m.id,
        displayName: m.name,
        avatarUrl: m.avatar_url,
        division: m.division,
        status: m.status,
        isHistorical: m.is_historical ?? false,
        lifetimePoints: round2(pts.get(m.id) ?? 0),
      }),
    )
    .sort(
      (a, b) => b.lifetimePoints - a.lifetimePoints || a.displayName.localeCompare(b.displayName),
    )
}

export async function getMemberOverview(
  memberId: string,
  lang: 'cs' | 'en' = 'cs',
): Promise<MemberOverview> {
  const member = await getMemberById(memberId)
  if (!member) throw new HttpError(404, 'not_found')

  const [entries, rounds, weeks, currentWeek] = await Promise.all([
    listMemberEntriesDetailed(memberId),
    listRounds(),
    listWeeks(),
    getCurrentWeek(todayIso()),
  ])
  const nm = (e: MemberStatEntry) => nameFor(e, lang)

  const lifetimePoints = round2(entries.reduce((s, e) => s + e.finalPoints, 0))

  // Per-round totals → round history (chronological, only rounds they played).
  const byRound = new Map<string, number>()
  for (const e of entries) byRound.set(e.roundId, (byRound.get(e.roundId) ?? 0) + e.finalPoints)
  const roundHistory = [...rounds]
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .filter((r) => byRound.has(r.id))
    .map((r) => ({ roundId: r.id, name: r.name, total: round2(byRound.get(r.id)!) }))

  // Per-week totals (chronological) for records + streak.
  const weekTotal = new Map<string, number>()
  for (const e of entries) weekTotal.set(e.weekId, (weekTotal.get(e.weekId) ?? 0) + e.finalPoints)
  const chronoTotals = weeks.map((w) => weekTotal.get(w.id) ?? 0)

  // Current week snapshot + detailed activity list.
  const cw = currentWeek ? entries.filter((e) => e.weekId === currentWeek.id) : []
  const weeklyPoints = round2(cw.reduce((s, e) => s + e.finalPoints, 0))
  let streakWeeks = 0
  if (currentWeek) {
    const past = weeks
      .filter((w) => w.start_date < currentWeek.start_date)
      .map((w) => weekTotal.get(w.id) ?? 0)
    streakWeeks = computeStreak(past, weeklyPoints)
  }
  const currentWeekActivities = cw
    .slice()
    .sort((a, b) => a.activityDate.localeCompare(b.activityDate))
    .map((e) => ({
      id: e.id,
      activityId: e.activityId,
      activityName: nm(e),
      quantity: e.quantity,
      unit: e.unit,
      elevationM: e.elevationM,
      withStroller: e.withStroller,
      points: round2(e.finalPoints),
      date: e.activityDate,
    }))

  // Detailed-only aggregates (distance / elevation / signature activities).
  const detailed = entries.filter((e) => e.activityId != null)
  const actPts = new Map<string, { nameCs: string; nameEn: string; points: number }>()
  const distMap = new Map<string, { nameCs: string; nameEn: string; km: number }>()
  const elevMap = new Map<string, { nameCs: string; nameEn: string; m: number }>()
  const weekDetail = new Map<string, { km: number; elev: number }>()
  for (const e of detailed) {
    const id = e.activityId!
    const names = { nameCs: e.activityNameCs ?? '', nameEn: e.activityNameEn ?? '' }
    const ap = actPts.get(id) ?? { ...names, points: 0 }
    ap.points = round2(ap.points + e.finalPoints)
    actPts.set(id, ap)
    if (e.unit === 'km') {
      const d = distMap.get(id) ?? { ...names, km: 0 }
      d.km = round2(d.km + e.quantity)
      distMap.set(id, d)
    }
    if (e.elevationM > 0) {
      const el = elevMap.get(id) ?? { ...names, m: 0 }
      el.m = round2(el.m + e.elevationM)
      elevMap.set(id, el)
    }
    const wd = weekDetail.get(e.weekStartDate) ?? { km: 0, elev: 0 }
    if (e.unit === 'km') wd.km += e.quantity
    wd.elev += e.elevationM
    weekDetail.set(e.weekStartDate, wd)
  }
  const distanceByActivity = [...distMap.entries()]
    .map(([activityId, v]) => ({ activityId, ...v }))
    .sort((a, b) => b.km - a.km)
  const elevationByActivity = [...elevMap.entries()]
    .map(([activityId, v]) => ({ activityId, ...v }))
    .sort((a, b) => b.m - a.m)
  const topActivities = [...actPts.entries()]
    .map(([activityId, v]) => ({ activityId, ...v }))
    .sort((a, b) => b.points - a.points)
    .slice(0, 10)

  // Total points split by activity (ALL entries, incl. a quick-add bucket) — the
  // pie sums to lifetime points. Quick-add entries have no rate-table activity.
  const paMap = new Map<string, { nameCs: string; nameEn: string; points: number }>()
  for (const e of entries) {
    const id = e.activityId ?? 'quickadd'
    const names = e.activityId
      ? { nameCs: e.activityNameCs ?? '', nameEn: e.activityNameEn ?? '' }
      : { nameCs: 'Rychlý zápis', nameEn: 'Quick add' }
    const cur = paMap.get(id) ?? { ...names, points: 0 }
    cur.points = round2(cur.points + e.finalPoints)
    paMap.set(id, cur)
  }
  const pointsByActivity = [...paMap.entries()]
    .map(([activityId, v]) => ({ activityId, ...v }))
    .sort((a, b) => b.points - a.points)

  // Best week: the highest-scoring week, with its round/number and activity split.
  let bestWeekId: string | null = null
  let bestWeekVal = 0
  for (const [wid, v] of weekTotal) {
    if (v > bestWeekVal) {
      bestWeekVal = v
      bestWeekId = wid
    }
  }
  let bestWeekDetail: MemberOverview['bestWeekDetail'] = null
  if (bestWeekId) {
    const wk = weeks.find((w) => w.id === bestWeekId)
    const round = rounds.find((r) => r.id === wk?.round_id)
    const acts = new Map<
      string,
      { activityId: string | null; activityName: string | null; points: number }
    >()
    for (const e of entries) {
      if (e.weekId !== bestWeekId) continue
      const key = e.activityId ?? 'quickadd'
      const cur = acts.get(key) ?? {
        activityId: e.activityId,
        activityName: e.activityId ? nm(e) : null,
        points: 0,
      }
      cur.points = round2(cur.points + e.finalPoints)
      acts.set(key, cur)
    }
    bestWeekDetail = {
      roundName: round?.name ?? '',
      weekNumber: wk?.week_number ?? 0,
      weekStart: wk?.start_date ?? '',
      points: round2(bestWeekVal),
      activities: [...acts.values()].sort((a, b) => b.points - a.points),
    }
  }

  // Weekly-consistency counts.
  const weeksLogged = chronoTotals.filter((t) => t > 0).length
  const weeksAtGoal = chronoTotals.filter((t) => t >= WEEKLY_GOAL).length
  const weeksBelowGoal = weeksLogged - weeksAtGoal
  const avgWeeklyPoints = weeksLogged > 0 ? round2(lifetimePoints / weeksLogged) : 0

  let cumKm = 0
  let cumElev = 0
  const cumulative = [...weekDetail.keys()].sort().map((weekStart) => {
    const d = weekDetail.get(weekStart)!
    cumKm = round2(cumKm + d.km)
    cumElev = round2(cumElev + d.elev)
    return { weekStart, km: cumKm, elevation: cumElev }
  })

  return memberOverviewSchema.parse({
    member: {
      id: member.id,
      displayName: member.name,
      avatarUrl: member.avatar_url,
      division: member.division,
      isHistorical: member.is_historical ?? false,
    },
    weekly: { weeklyPoints, weeklyGoal: WEEKLY_GOAL, streakWeeks },
    currentWeekActivities,
    records: {
      lifetimePoints,
      roundsPlayed: roundHistory.length,
      bestWeek: round2(Math.max(0, ...chronoTotals)),
      longestStreakWeeks: longestStreakWeeks(chronoTotals),
      weeksAtGoal,
      weeksBelowGoal,
      weeksLogged,
      avgWeeklyPoints,
      favouriteActivity:
        favouriteActivity(entries.map((e) => ({ activityName: nm(e), points: e.finalPoints }))) ??
        '—',
      totalKm: round2([...distMap.values()].reduce((s, v) => s + v.km, 0)),
      totalElevation: round2([...elevMap.values()].reduce((s, v) => s + v.m, 0)),
    },
    bestWeekDetail,
    pointsByActivity,
    topActivities,
    roundHistory,
    pointsByDayOfWeek: pointsByDay(
      entries.map((e) => ({ date: e.activityDate, points: e.finalPoints })),
    ),
    distanceByActivity,
    elevationByActivity,
    cumulative,
  })
}

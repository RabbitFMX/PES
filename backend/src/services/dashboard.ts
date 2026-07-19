import {
  getChallengeForWeek,
  hasSubmittedToChallenge,
  listWeekChallengeBonus,
} from '../db/challenges'
import { listRoundEntries } from '../db/logEntries'
import { listActiveMembers } from '../db/members'
import { getMemberRoundDivisions, getOpenRound } from '../db/rounds'
import { getCurrentWeek, listWeeksByRound } from '../db/weeks'
import type { MemberRow } from '../db/types'
import { dashboardDataSchema, type DashboardData } from '../schemas/dashboard'
import { meetsWeeklyGoal, rankStandings, WEEKLY_GOAL } from './standings'

/**
 * Dashboard logic (chunk 7): the logged-in member's current-week summary.
 * Everything is derived at query time from log entries — nothing is stored.
 * No Express types leak in; the router is thin glue over `getDashboard`.
 */

/** Today as an ISO `YYYY-MM-DD` string. */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Round to 2 decimals (points are stored to 2 dp; JS sums can drift). */
function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * The 100+ streak: consecutive weeks (most recent first) at or above the goal.
 * The current week is still in progress, so it only extends the streak once it
 * has already met the goal — a current week below the goal does not break a
 * streak of completed weeks. `pastWeekTotals` is the member's completed-week
 * totals in chronological order (most recent last).
 */
export function computeStreak(
  pastWeekTotals: number[],
  currentWeekPoints: number,
  goal: number = WEEKLY_GOAL,
): number {
  let streak = meetsWeeklyGoal(currentWeekPoints, goal) ? 1 : 0
  for (let i = pastWeekTotals.length - 1; i >= 0; i--) {
    if (meetsWeeklyGoal(pastWeekTotals[i], goal)) streak++
    else break
  }
  return streak
}

/** The all-zero dashboard for a member with no open round/week yet. */
function emptyDashboard(): DashboardData {
  return dashboardDataSchema.parse({
    weeklyPoints: 0,
    weeklyGoal: WEEKLY_GOAL,
    roundTotal: 0,
    packRank: 0,
    packSize: 0,
    streakWeeks: 0,
    currentChallenge: null,
  })
}

export async function getDashboard(member: MemberRow): Promise<DashboardData> {
  const round = await getOpenRound()
  const week = await getCurrentWeek(todayIso())
  // No open round/week (new install or between rounds) → empty state.
  if (!round || !week) return emptyDashboard()

  const weeks = await listWeeksByRound(round.id)
  const weekIds = weeks.map((w) => w.id)
  const [entries, bonus] = await Promise.all([
    listRoundEntries(weekIds),
    listWeekChallengeBonus(weekIds),
  ])

  // Per-member round totals, and this member's per-week totals in one pass.
  const roundTotalByMember = new Map<string, number>()
  const memberPointsByWeek = new Map<string, number>()
  for (const e of entries) {
    roundTotalByMember.set(e.member_id, (roundTotalByMember.get(e.member_id) ?? 0) + e.final_points)
    if (e.member_id === member.id) {
      memberPointsByWeek.set(e.week_id, (memberPointsByWeek.get(e.week_id) ?? 0) + e.final_points)
    }
  }
  // Challenge bonus counts into round totals (all members, for pack rank) and
  // this member's weekly totals (goal, streak).
  for (const b of bonus) {
    roundTotalByMember.set(b.member_id, (roundTotalByMember.get(b.member_id) ?? 0) + b.bonus_points)
    if (b.member_id === member.id) {
      memberPointsByWeek.set(b.week_id, (memberPointsByWeek.get(b.week_id) ?? 0) + b.bonus_points)
    }
  }

  const weeklyPoints = round2(memberPointsByWeek.get(week.id) ?? 0)
  const roundTotal = round2(roundTotalByMember.get(member.id) ?? 0)

  // Pack rank/size: rank the member within their division for this round.
  // Use member_round_division when recorded (past rounds), else member.division.
  const members = await listActiveMembers()
  const divisions = await getMemberRoundDivisions(round.id)
  const divisionOf = new Map(divisions.map((d) => [d.member_id, d.division]))
  const myDivision = divisionOf.get(member.id) ?? member.division
  const packInputs = members
    .filter((m) => (divisionOf.get(m.id) ?? m.division) === myDivision)
    .map((m) => ({ memberId: m.id, roundTotal: round2(roundTotalByMember.get(m.id) ?? 0) }))
  const ranked = rankStandings(packInputs)
  const packRank = ranked.find((r) => r.memberId === member.id)?.rank ?? 0
  const packSize = ranked.length

  // Streak: completed weeks (week_number < current) in chronological order.
  const pastWeekTotals = weeks
    .filter((w) => w.week_number < week.week_number)
    .map((w) => memberPointsByWeek.get(w.id) ?? 0)
  const streakWeeks = computeStreak(pastWeekTotals, weeklyPoints)

  // This week's challenge pointer, with whether the member submitted.
  const challenge = await getChallengeForWeek(week.id)
  const currentChallenge = challenge
    ? {
        id: challenge.id,
        title: challenge.title,
        hasSubmitted: await hasSubmittedToChallenge(challenge.id, member.id),
      }
    : null

  return dashboardDataSchema.parse({
    weeklyPoints,
    weeklyGoal: WEEKLY_GOAL,
    roundTotal,
    packRank,
    packSize,
    streakWeeks,
    currentChallenge,
  })
}

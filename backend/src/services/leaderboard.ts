import { listWeekChallengeBonus } from '../db/challenges'
import { listRoundEntries } from '../db/logEntries'
import { listActiveMembers } from '../db/members'
import { getMemberRoundDivisions, getOpenRound } from '../db/rounds'
import { getCurrentWeek, listWeeksByRound } from '../db/weeks'
import type { MemberRow } from '../db/types'
import { leaderboardDataSchema, type LeaderboardData } from '../schemas/leaderboard'
import { meetsWeeklyGoal, rankStandings } from './standings'

/**
 * Leaderboard logic (chunk 8): current-round standings split by pack. Reuses
 * the shared `standings` helper (chunk 7) for the sort + rank so the dashboard's
 * `packRank` and the leaderboard agree. Pure and DB layers are separated: the
 * ranking/grouping is in `buildLeaderboard` (unit-tested) and `getLeaderboard`
 * only fetches and maps rows.
 *
 * Rows are members who logged activity this round (`roundTotal > 0`); a pack
 * with no logged activity is an empty array so the frontend renders its
 * "be first" empty state. A zero-total member never outranks anyone with
 * points, so filtering them out keeps ranks identical to the dashboard.
 */

/** A member reduced to what the leaderboard needs, with division resolved. */
export interface LeaderboardMember {
  id: string
  displayName: string
  avatarUrl: string | null
  /** Division for the current round (member_round_division ?? member.division). */
  division: 'A' | 'B'
}

export interface BuildLeaderboardInput {
  members: LeaderboardMember[]
  roundEntries: { memberId: string; weekId: string; finalPoints: number }[]
  /** Challenge bonus points per member per week (fold into weekly + round totals). */
  challengeBonus?: { memberId: string; weekId: string; points: number }[]
  /** The current open week's id (null between weeks) for goal-met status. */
  currentWeekId: string | null
  /** The requester's id, to flag their row. */
  currentUserId: string
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** Pure standings build: aggregate, filter to participants, rank, map to rows. */
export function buildLeaderboard(input: BuildLeaderboardInput): LeaderboardData {
  const { members, roundEntries, challengeBonus = [], currentWeekId, currentUserId } = input

  const roundTotalByMember = new Map<string, number>()
  const weekPointsByMember = new Map<string, number>()
  for (const e of roundEntries) {
    roundTotalByMember.set(e.memberId, (roundTotalByMember.get(e.memberId) ?? 0) + e.finalPoints)
    if (currentWeekId !== null && e.weekId === currentWeekId) {
      weekPointsByMember.set(e.memberId, (weekPointsByMember.get(e.memberId) ?? 0) + e.finalPoints)
    }
  }
  // Challenge bonus counts into the round total and the current-week goal.
  for (const b of challengeBonus) {
    roundTotalByMember.set(b.memberId, (roundTotalByMember.get(b.memberId) ?? 0) + b.points)
    if (currentWeekId !== null && b.weekId === currentWeekId) {
      weekPointsByMember.set(b.memberId, (weekPointsByMember.get(b.memberId) ?? 0) + b.points)
    }
  }

  const byId = new Map(members.map((m) => [m.id, m]))

  function packFor(division: 'A' | 'B') {
    const inputs = members
      .filter((m) => m.division === division)
      .map((m) => ({ memberId: m.id, roundTotal: round2(roundTotalByMember.get(m.id) ?? 0) }))
      // Only members who logged activity this round appear on the board.
      .filter((s) => s.roundTotal > 0)

    return rankStandings(inputs).map((s) => {
      const m = byId.get(s.memberId)!
      return {
        memberId: s.memberId,
        displayName: m.displayName,
        avatarUrl: m.avatarUrl,
        rank: s.rank,
        roundTotal: s.roundTotal,
        goalMetThisWeek: meetsWeeklyGoal(weekPointsByMember.get(s.memberId) ?? 0),
        isCurrentUser: s.memberId === currentUserId,
      }
    })
  }

  return leaderboardDataSchema.parse({ packA: packFor('A'), packB: packFor('B') })
}

export async function getLeaderboard(member: MemberRow): Promise<LeaderboardData> {
  const round = await getOpenRound()
  const week = await getCurrentWeek(new Date().toISOString().slice(0, 10))
  // No open round → both packs empty (frontend "be first" state).
  if (!round) return leaderboardDataSchema.parse({ packA: [], packB: [] })

  const weeks = await listWeeksByRound(round.id)
  const weekIds = weeks.map((w) => w.id)
  const [entries, members, divisions, bonus] = await Promise.all([
    listRoundEntries(weekIds),
    listActiveMembers(),
    getMemberRoundDivisions(round.id),
    listWeekChallengeBonus(weekIds),
  ])

  const divisionOf = new Map(divisions.map((d) => [d.member_id, d.division]))
  const leaderboardMembers: LeaderboardMember[] = members.map((m) => ({
    id: m.id,
    displayName: m.name,
    avatarUrl: m.avatar_url,
    division: divisionOf.get(m.id) ?? m.division,
  }))

  return buildLeaderboard({
    members: leaderboardMembers,
    roundEntries: entries.map((e) => ({
      memberId: e.member_id,
      weekId: e.week_id,
      finalPoints: e.final_points,
    })),
    challengeBonus: bonus.map((b) => ({
      memberId: b.member_id,
      weekId: b.week_id,
      points: b.bonus_points,
    })),
    currentWeekId: week?.id ?? null,
    currentUserId: member.id,
  })
}

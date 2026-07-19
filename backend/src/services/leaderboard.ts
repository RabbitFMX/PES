import { listRoundEntries, listWeeksActivityPoints } from '../db/logEntries'
import { listActiveMembers } from '../db/members'
import { getMemberRoundDivisions, listRounds } from '../db/rounds'
import { getCurrentWeek, listWeeksByRound } from '../db/weeks'
import type { MemberRow } from '../db/types'
import {
  leaderboardDataSchema,
  roundOptionSchema,
  type LeaderboardData,
  type RoundOption,
} from '../schemas/leaderboard'
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

export interface ActivityPointsRow {
  memberId: string
  activityId: string | null
  nameCs: string
  nameEn: string
  points: number
}

export interface BuildLeaderboardInput {
  members: LeaderboardMember[]
  roundEntries: { memberId: string; weekId: string; finalPoints: number }[]
  /** Per-member × per-activity points for the round (expandable breakdown). */
  activityBreakdown?: ActivityPointsRow[]
  /** The current open week's id (null between weeks) for goal-met status. */
  currentWeekId: string | null
  /** The requester's id, to flag their row. */
  currentUserId: string
  /** Round meta echoed into the payload (defaults keep unit tests terse). */
  roundId?: string | null
  roundName?: string
  isOpenRound?: boolean
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** Pure standings build: aggregate, filter to participants, rank, map to rows. */
export function buildLeaderboard(input: BuildLeaderboardInput): LeaderboardData {
  const {
    members,
    roundEntries,
    activityBreakdown = [],
    currentWeekId,
    currentUserId,
    roundId = null,
    roundName = '',
    isOpenRound = true,
  } = input

  const roundTotalByMember = new Map<string, number>()
  const weekPointsByMember = new Map<string, number>()
  for (const e of roundEntries) {
    roundTotalByMember.set(e.memberId, (roundTotalByMember.get(e.memberId) ?? 0) + e.finalPoints)
    if (currentWeekId !== null && e.weekId === currentWeekId) {
      weekPointsByMember.set(e.memberId, (weekPointsByMember.get(e.memberId) ?? 0) + e.finalPoints)
    }
  }

  // Per-member activity breakdown (sorted highest-first per member).
  const breakdownByMember = new Map<string, ActivityPointsRow[]>()
  for (const a of activityBreakdown) {
    const list = breakdownByMember.get(a.memberId) ?? []
    list.push(a)
    breakdownByMember.set(a.memberId, list)
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
      const pointsByActivity = (breakdownByMember.get(s.memberId) ?? [])
        .slice()
        .sort((a, b) => b.points - a.points)
        .map((a) => ({
          activityId: a.activityId,
          nameCs: a.nameCs,
          nameEn: a.nameEn,
          points: round2(a.points),
        }))
      return {
        memberId: s.memberId,
        displayName: m.displayName,
        avatarUrl: m.avatarUrl,
        rank: s.rank,
        roundTotal: s.roundTotal,
        goalMetThisWeek: meetsWeeklyGoal(weekPointsByMember.get(s.memberId) ?? 0),
        isCurrentUser: s.memberId === currentUserId,
        pointsByActivity,
      }
    })
  }

  return leaderboardDataSchema.parse({
    roundId,
    roundName,
    isOpenRound,
    packA: packFor('A'),
    packB: packFor('B'),
  })
}

/** Non-admin list of rounds for the leaderboard filter (newest-first). */
export async function getRoundOptions(): Promise<RoundOption[]> {
  const rounds = await listRounds()
  return rounds.map((r) =>
    roundOptionSchema.parse({
      id: r.id,
      name: r.name,
      status: r.status,
      startDate: r.start_date,
      endDate: r.end_date,
    }),
  )
}

/**
 * Standings for one round. `roundId` selects a round to browse; unset resolves
 * to the open round, else the most recent one. Past (non-open) rounds have no
 * "current week", so `goalMetThisWeek` is false and `isOpenRound` tells the UI
 * to hide that column.
 */
export async function getLeaderboard(
  member: MemberRow,
  roundId?: string,
): Promise<LeaderboardData> {
  const rounds = await listRounds()
  if (rounds.length === 0) {
    return leaderboardDataSchema.parse({
      roundId: null,
      roundName: '',
      isOpenRound: false,
      packA: [],
      packB: [],
    })
  }

  const chrono = [...rounds].sort((a, b) => a.start_date.localeCompare(b.start_date))
  const openRound = rounds.find((r) => r.status === 'open') ?? null
  const round =
    (roundId && rounds.find((r) => r.id === roundId)) || openRound || chrono[chrono.length - 1]
  const isOpenRound = round.status === 'open'

  const week = isOpenRound ? await getCurrentWeek(new Date().toISOString().slice(0, 10)) : null

  const weeks = await listWeeksByRound(round.id)
  const weekIds = weeks.map((w) => w.id)
  const [entries, members, divisions, breakdown] = await Promise.all([
    listRoundEntries(weekIds),
    listActiveMembers(),
    getMemberRoundDivisions(round.id),
    listWeeksActivityPoints(weekIds),
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
    activityBreakdown: breakdown.map((b) => ({
      memberId: b.member_id,
      activityId: b.activity_id,
      nameCs: b.name_cs,
      nameEn: b.name_en,
      points: b.points,
    })),
    currentWeekId: week?.id ?? null,
    currentUserId: member.id,
    roundId: round.id,
    roundName: round.name,
    isOpenRound,
  })
}

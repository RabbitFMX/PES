/**
 * Shared standings helpers: turn per-member round totals into a ranked table,
 * and the weekly-goal predicate. Pure functions (no DB, no Express) so they are
 * unit-testable and reused by both the Dashboard (chunk 7) and the Leaderboard
 * (chunk 8).
 */

/** The weekly goal every member chases (project-brief §15). */
export const WEEKLY_GOAL = 100

export interface StandingInput {
  memberId: string
  /** Sum of the member's `final_points` across the round's weeks. */
  roundTotal: number
}

export interface Standing extends StandingInput {
  /** 1-based rank within the group. */
  rank: number
}

/**
 * Rank members by `roundTotal`, highest first. Ties **share** a rank (standard
 * competition ranking: two tied for 1st are both rank 1, the next is rank 3).
 * Rows with equal totals are ordered by `memberId` for a stable, deterministic
 * output; that ordering does not affect the shared rank.
 */
export function rankStandings(rows: StandingInput[]): Standing[] {
  const sorted = [...rows].sort(
    (a, b) => b.roundTotal - a.roundTotal || a.memberId.localeCompare(b.memberId),
  )

  let lastTotal: number | null = null
  let lastRank = 0
  return sorted.map((row, index) => {
    // A new (lower) total takes the position rank (index + 1); an equal total
    // keeps the previous rank.
    const rank = lastTotal !== null && row.roundTotal === lastTotal ? lastRank : index + 1
    lastTotal = row.roundTotal
    lastRank = rank
    return { ...row, rank }
  })
}

/** Whether a week's point total meets the weekly goal. */
export function meetsWeeklyGoal(weeklyPoints: number, goal: number = WEEKLY_GOAL): boolean {
  return weeklyPoints >= goal
}

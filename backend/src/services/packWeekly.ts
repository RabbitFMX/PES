import { listRoundEntries } from '../db/logEntries'
import { listAllMembers } from '../db/members'
import { listRounds } from '../db/rounds'
import { listWeeksByRound } from '../db/weeks'
import { packWeeklySchema, type PackWeekly } from '../schemas/packWeekly'

/**
 * Per-week per-member points for a single round (the "compare by week" chart).
 * Picks the requested round, else the open round, else the most recent one.
 * Only members who logged something in the round are returned.
 */

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export async function getPackWeekly(roundId?: string): Promise<PackWeekly> {
  const rounds = await listRounds()
  if (rounds.length === 0) {
    return packWeeklySchema.parse({ roundId: '', roundName: '', weeks: [], members: [] })
  }

  const chrono = [...rounds].sort((a, b) => a.start_date.localeCompare(b.start_date))
  const round =
    (roundId && rounds.find((r) => r.id === roundId)) ||
    rounds.find((r) => r.status === 'open') ||
    chrono[chrono.length - 1]

  const weeks = (await listWeeksByRound(round.id)).sort((a, b) => a.week_number - b.week_number)
  const [members, entries] = await Promise.all([
    listAllMembers(),
    listRoundEntries(weeks.map((w) => w.id)),
  ])

  // Per-member → per-week totals.
  const byMemberWeek = new Map<string, Map<string, number>>()
  for (const e of entries) {
    const mw = byMemberWeek.get(e.member_id) ?? new Map<string, number>()
    mw.set(e.week_id, round2((mw.get(e.week_id) ?? 0) + e.final_points))
    byMemberWeek.set(e.member_id, mw)
  }

  const nameById = new Map(members.map((m) => [m.id, m.name]))
  const membersOut = [...byMemberWeek.keys()]
    .map((id) => {
      const mw = byMemberWeek.get(id)!
      return {
        memberId: id,
        displayName: nameById.get(id) ?? '—',
        weekly: weeks.map((w) => (mw.has(w.id) ? mw.get(w.id)! : null)),
      }
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName))

  return packWeeklySchema.parse({
    roundId: round.id,
    roundName: round.name,
    weeks: weeks.map((w) => ({ weekNumber: w.week_number })),
    members: membersOut,
  })
}

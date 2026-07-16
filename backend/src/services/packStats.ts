import { listRoundEntries, listDetailedActivityPoints } from '../db/logEntries'
import { listAllMembers } from '../db/members'
import { listRounds } from '../db/rounds'
import { listWeeks } from '../db/weeks'
import { packStatsSchema, type PackStats } from '../schemas/packStats'

/**
 * Whole-pack comparison stats (Statistiky tab). One pass over every log entry
 * across all rounds builds: lifetime ranking, per-round group totals + winners,
 * and a per-member per-round matrix. Winner = highest round total overall
 * (matches the spreadsheet's single "vítěz" per round).
 */

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export async function getPackStats(): Promise<PackStats> {
  const [rounds, weeks, members] = await Promise.all([listRounds(), listWeeks(), listAllMembers()])
  // Chronological (oldest first); listRounds is newest-first.
  const chrono = [...rounds].sort((a, b) => a.start_date.localeCompare(b.start_date))
  const weekRound = new Map(weeks.map((w) => [w.id, w.round_id]))
  const entries = await listRoundEntries(weeks.map((w) => w.id))

  // Per-round → per-member totals.
  const perRound = new Map<string, Map<string, number>>()
  for (const e of entries) {
    const rid = weekRound.get(e.week_id)
    if (!rid) continue
    const m = perRound.get(rid) ?? new Map<string, number>()
    m.set(e.member_id, (m.get(e.member_id) ?? 0) + e.final_points)
    perRound.set(rid, m)
  }

  const memberById = new Map(members.map((m) => [m.id, m]))
  const lifetime = new Map<string, { pts: number; rounds: number; wins: number }>()

  // Per-member strongest activities (detailed entries only; quick-add excluded).
  const detailed = await listDetailedActivityPoints()
  const actByMember = new Map<string, Map<string, { nameCs: string; nameEn: string; points: number }>>()
  for (const d of detailed) {
    const byAct = actByMember.get(d.member_id) ?? new Map()
    const cur = byAct.get(d.activity_id) ?? { nameCs: d.name_cs, nameEn: d.name_en, points: 0 }
    cur.points = round2(cur.points + d.final_points)
    byAct.set(d.activity_id, cur)
    actByMember.set(d.member_id, byAct)
  }
  const topActivitiesOf = (memberId: string) =>
    [...(actByMember.get(memberId)?.entries() ?? [])]
      .map(([activityId, v]) => ({ activityId, nameCs: v.nameCs, nameEn: v.nameEn, points: v.points }))
      .sort((a, b) => b.points - a.points || a.activityId.localeCompare(b.activityId))
      .slice(0, 3)

  const roundsOut = chrono.map((r) => {
    const totals = perRound.get(r.id) ?? new Map<string, number>()
    let groupTotal = 0
    let participants = 0
    let winner: { memberId: string; total: number } | null = null
    for (const [mid, tot] of totals) {
      const t = round2(tot)
      groupTotal += t
      if (t > 0) participants += 1
      const cur = lifetime.get(mid) ?? { pts: 0, rounds: 0, wins: 0 }
      cur.pts = round2(cur.pts + t)
      if (t > 0) cur.rounds += 1
      lifetime.set(mid, cur)
      if (t > 0 && (!winner || t > winner.total)) winner = { memberId: mid, total: t }
    }
    if (winner) lifetime.get(winner.memberId)!.wins += 1
    return {
      roundId: r.id,
      name: r.name,
      status: r.status,
      startDate: r.start_date,
      groupTotal: round2(groupTotal),
      participants,
      winner: winner
        ? {
            memberId: winner.memberId,
            displayName: memberById.get(winner.memberId)?.name ?? '—',
            total: winner.total,
          }
        : null,
    }
  })

  const allTime = [...lifetime.entries()]
    .map(([mid, v]) => {
      const m = memberById.get(mid)
      return {
        memberId: mid,
        displayName: m?.name ?? '—',
        avatarUrl: m?.avatar_url ?? null,
        division: (m?.division ?? 'A') as 'A' | 'B',
        lifetimePoints: round2(v.pts),
        roundsPlayed: v.rounds,
        wins: v.wins,
        topActivities: topActivitiesOf(mid),
      }
    })
    .sort((a, b) => b.lifetimePoints - a.lifetimePoints || a.displayName.localeCompare(b.displayName))

  const roundTotals = allTime.map((m) => ({
    memberId: m.memberId,
    displayName: m.displayName,
    totals: chrono.map((r) => {
      const t = perRound.get(r.id)?.get(m.memberId)
      return t === undefined ? null : round2(t)
    }),
  }))

  const openRound = chrono.find((r) => r.status === 'open')

  return packStatsSchema.parse({
    totals: {
      rounds: chrono.length,
      members: allTime.length,
      allTimePoints: round2(allTime.reduce((s, m) => s + m.lifetimePoints, 0)),
      currentRoundName: openRound?.name ?? null,
    },
    allTime,
    rounds: roundsOut,
    roundTotals,
  })
}

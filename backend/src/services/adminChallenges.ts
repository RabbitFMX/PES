import {
  getChallengeById,
  getChallengeForWeek,
  listSubmissions,
  upsertBonusAward,
} from '../db/challenges'
import { listActiveMembers } from '../db/members'
import { getCurrentWeek } from '../db/weeks'
import type { AdminResult } from '../schemas/admin'
import {
  adminChallengeSchema,
  type AdminChallenge,
  type ChallengeScoresInput,
} from '../schemas/challenge'

/**
 * Admin challenge scoring (Feature 3). Lets an admin/setter award and edit
 * completion points per member for the current week's challenge; those points
 * count into weekly + round totals (folded in by the leaderboard/dashboard/
 * overview services via `listWeekChallengeBonus`).
 */

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

/** GET /api/admin/challenges/current — the roster + current awards to edit. */
export async function getCurrentChallengeForAdmin(): Promise<AdminChallenge> {
  const week = await getCurrentWeek(todayIso())
  const challenge = week ? await getChallengeForWeek(week.id) : null
  if (!challenge) {
    return adminChallengeSchema.parse({
      challengeId: null,
      title: '',
      scoringMode: 'competitive',
      members: [],
    })
  }

  const [members, subs] = await Promise.all([listActiveMembers(), listSubmissions(challenge.id)])
  const awardOf = new Map(subs.map((s) => [s.memberId, s.bonusPoints]))

  return adminChallengeSchema.parse({
    challengeId: challenge.id,
    title: challenge.title,
    scoringMode: challenge.scoring_mode ?? 'competitive',
    members: members.map((m) => ({
      memberId: m.id,
      displayName: m.name,
      division: m.division,
      points: awardOf.get(m.id) ?? 0,
    })),
  })
}

/** PUT /api/admin/challenges/:id/scores — award/edit completion points. */
export async function setChallengeScores(
  challengeId: string,
  input: ChallengeScoresInput,
): Promise<AdminResult> {
  const challenge = await getChallengeById(challengeId)
  if (!challenge) return { ok: false, message: 'not_found' }

  for (const s of input.scores) {
    await upsertBonusAward(challengeId, s.memberId, s.points)
  }
  return { ok: true }
}

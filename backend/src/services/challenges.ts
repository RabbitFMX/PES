import { getCurrentWeek } from '../db/weeks'
import {
  countChallenges,
  getChallengeById,
  getChallengeForWeek,
  insertChallenge,
  listClosedChallenges,
  listSubmissions,
  setSubmissionScores,
  upsertSubmission,
} from '../db/challenges'
import { getRotation } from '../db/rotation'
import type { MemberRow } from '../db/types'
import { HttpError } from '../middleware/errorHandler'
import {
  challengeDataSchema,
  pastChallengeSchema,
  type ChallengeCreateInput,
  type ChallengeData,
  type PastChallenge,
} from '../schemas/challenge'

/**
 * Challenges logic (chunk 10). The bonus/tie-split maths is the pure
 * `computeBonuses` below (unit-tested in isolation); the rest orchestrates the
 * DB layer for the four endpoints.
 */

/** Default placement points: 30 for 1st, 20 for 2nd, 10 for 3rd (§15/§22). */
export const DEFAULT_BONUS_SPLIT = [30, 20, 10]

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export interface RankedSubmission {
  memberId: string
  value: number
  rank: number
  bonusPoints: number
}

/**
 * Rank submissions (highest value wins) and award bonus points. Ties **share**
 * a placement (competition ranking: two tied for 1st are both rank 1, the next
 * is rank 3) and **split that placement's points evenly** — so a 2-way tie for
 * 1st is 15/15 and the next member (rank 3) gets the 3rd-place points; the
 * 2nd-place points are not awarded (§15/§22 Feature 5). Members ranked beyond
 * the split length get 0. Deterministic tiebreak by memberId for equal values.
 */
export function computeBonuses(
  submissions: { memberId: string; value: number }[],
  split: number[] = DEFAULT_BONUS_SPLIT,
): RankedSubmission[] {
  const sorted = [...submissions].sort(
    (a, b) => b.value - a.value || a.memberId.localeCompare(b.memberId),
  )

  // Competition ranks (ties share a rank; the next rank skips).
  let lastValue: number | null = null
  let lastRank = 0
  const ranked = sorted.map((s, i) => {
    const rank = lastValue !== null && s.value === lastValue ? lastRank : i + 1
    lastValue = s.value
    lastRank = rank
    return { ...s, rank }
  })

  // How many share each rank, to split the placement's points evenly.
  const countAtRank = new Map<number, number>()
  for (const s of ranked) countAtRank.set(s.rank, (countAtRank.get(s.rank) ?? 0) + 1)

  return ranked.map((s) => {
    const placementPoints = split[s.rank - 1]
    const bonusPoints =
      placementPoints === undefined ? 0 : round2(placementPoints / countAtRank.get(s.rank)!)
    return { memberId: s.memberId, value: s.value, rank: s.rank, bonusPoints }
  })
}

/** Today as an ISO `YYYY-MM-DD` string. */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Whose turn it is to set a challenge: the rotation advances one slot per
 * challenge ever created, so the current setter is
 * `rotation[challengeCount % rotation.length]`. Null when the rotation is empty.
 */
async function currentSetterId(): Promise<string | null> {
  const rotation = await getRotation()
  if (rotation.length === 0) return null
  const count = await countChallenges()
  return rotation[count % rotation.length].memberId
}

const EMPTY_CHALLENGE = {
  id: null,
  title: '',
  description: '',
  deadline: '',
  hasSubmitted: false,
  submissions: [],
}

/** GET /api/challenges/current — this week's challenge + ranked submissions. */
export async function getCurrentChallenge(member: MemberRow): Promise<ChallengeData> {
  const week = await getCurrentWeek(todayIso())
  if (!week) {
    return challengeDataSchema.parse({ ...EMPTY_CHALLENGE, isSetterTurn: false })
  }

  const challenge = await getChallengeForWeek(week.id)
  if (!challenge) {
    // No challenge yet: the current setter sees the create form.
    const isSetterTurn = (await currentSetterId()) === member.id
    return challengeDataSchema.parse({ ...EMPTY_CHALLENGE, isSetterTurn })
  }

  const rows = await listSubmissions(challenge.id)
  const withValues = rows.filter((r) => r.value !== null) as {
    memberId: string
    displayName: string
    value: number
  }[]
  const nameOf = new Map(rows.map((r) => [r.memberId, r.displayName]))
  const ranked = computeBonuses(
    withValues.map((r) => ({ memberId: r.memberId, value: r.value })),
    challenge.bonus_split ?? DEFAULT_BONUS_SPLIT,
  )

  return challengeDataSchema.parse({
    id: challenge.id,
    title: challenge.title,
    description: challenge.description ?? '',
    deadline: challenge.deadline ?? '',
    isSetterTurn: false, // a challenge already exists this week
    hasSubmitted: rows.some((r) => r.memberId === member.id),
    submissions: ranked.map((r) => ({
      memberId: r.memberId,
      displayName: nameOf.get(r.memberId) ?? '',
      value: r.value,
      rank: r.rank,
      bonusPoints: r.bonusPoints,
    })),
  })
}

/** GET /api/challenges/past — recent finished challenges with their winner. */
export async function getPastChallenges(limit = 10): Promise<PastChallenge[]> {
  const closed = await listClosedChallenges(limit)
  const results = await Promise.all(
    closed.map(async (c) => {
      const rows = await listSubmissions(c.id)
      const withValues = rows.filter((r) => r.value !== null) as {
        memberId: string
        value: number
      }[]
      const nameOf = new Map(rows.map((r) => [r.memberId, r.displayName]))
      const ranked = computeBonuses(
        withValues.map((r) => ({ memberId: r.memberId, value: r.value })),
      )
      const winnerId = ranked.find((r) => r.rank === 1)?.memberId
      return pastChallengeSchema.parse({
        id: c.id,
        title: c.title,
        winner: winnerId ? (nameOf.get(winnerId) ?? '') : '—',
        weekLabel: `Týden ${c.weekNumber}`,
      })
    }),
  )
  return results
}

/**
 * POST /api/challenges — create this week's challenge. Only the current setter
 * may create, and only when none exists this week.
 */
export async function createChallenge(
  member: MemberRow,
  input: ChallengeCreateInput,
): Promise<void> {
  const week = await getCurrentWeek(todayIso())
  if (!week) throw new HttpError(409, 'no_open_week')

  const existing = await getChallengeForWeek(week.id)
  if (existing) throw new HttpError(409, 'challenge_exists')

  if ((await currentSetterId()) !== member.id) throw new HttpError(403, 'not_setter')

  await insertChallenge({
    week_id: week.id,
    setter_member_id: member.id,
    title: input.title,
    description: input.description,
    deadline: input.deadline,
    bonus_split: input.bonusSplit ?? null,
  })
}

/**
 * POST /api/challenges/:id/submissions — upsert the member's value (latest
 * wins), then recompute and persist every submission's rank + bonus.
 */
export async function submitToChallenge(
  member: MemberRow,
  challengeId: string,
  value: number,
): Promise<void> {
  const challenge = await getChallengeById(challengeId)
  if (!challenge) throw new HttpError(404, 'unknown_challenge')

  await upsertSubmission(challengeId, member.id, value)

  const rows = await listSubmissions(challengeId)
  const withValues = rows.filter((r) => r.value !== null) as { memberId: string; value: number }[]
  const ranked = computeBonuses(
    withValues.map((r) => ({ memberId: r.memberId, value: r.value })),
    challenge.bonus_split ?? DEFAULT_BONUS_SPLIT,
  )
  await setSubmissionScores(
    challengeId,
    ranked.map((r) => ({ memberId: r.memberId, rank: r.rank, bonusPoints: r.bonusPoints })),
  )
}

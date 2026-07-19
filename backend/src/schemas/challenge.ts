import { z } from 'zod'

/**
 * Request/response shapes for the Challenges API (chunk 10), matching the
 * frontend `ChallengeData` / `ChallengeSubmissionRow` / `PastChallenge` types.
 */

/** A ranked submission row shown under the current challenge. */
export const challengeSubmissionRowSchema = z.object({
  memberId: z.string(),
  displayName: z.string(),
  value: z.number().nullable(), // null for completion-scored challenges (no value)
  rank: z.number().nullable(),
  bonusPoints: z.number(),
})

export const scoringModeSchema = z.enum(['competitive', 'completion'])
export type ScoringMode = z.infer<typeof scoringModeSchema>

export const challengeDataSchema = z.object({
  id: z.string().nullable(),
  title: z.string(),
  description: z.string(),
  deadline: z.string(),
  scoringMode: scoringModeSchema,
  /** Whose turn it is to set the challenge (the current setter), for the
   *  always-visible "X sets this week's challenge" line. Null if no rotation. */
  setterMemberId: z.string().nullable(),
  setterName: z.string().nullable(),
  isSetterTurn: z.boolean(),
  hasSubmitted: z.boolean(),
  submissions: z.array(challengeSubmissionRowSchema),
})

export type ChallengeData = z.infer<typeof challengeDataSchema>

export const pastChallengeSchema = z.object({
  id: z.string(),
  title: z.string(),
  winner: z.string(),
  weekLabel: z.string(),
})

export type PastChallenge = z.infer<typeof pastChallengeSchema>

/**
 * Create-challenge body. `bonusSplit` is an optional custom placement-points
 * override (default 30/20/10 lives in the service); each entry must be a
 * non-negative number.
 */
export const challengeCreateSchema = z
  .object({
    title: z.string().min(1).max(200),
    // The editable challenge text box — capped at 1000 characters.
    description: z.string().max(1000).default(''),
    // Optional: a plain-text challenge need not have a deadline.
    deadline: z.string().datetime({ offset: true }).nullable().optional(),
    scoringMode: scoringModeSchema.default('competitive'),
    bonusSplit: z.array(z.number().nonnegative()).min(1).optional(),
  })
  .strict()

export type ChallengeCreateInput = z.infer<typeof challengeCreateSchema>

/** Submit-a-value body. */
export const submissionCreateSchema = z.object({ value: z.number() }).strict()

export type SubmissionCreateInput = z.infer<typeof submissionCreateSchema>

/** Admin view of the current challenge for awarding completion points. */
export const adminChallengeSchema = z.object({
  challengeId: z.string().nullable(),
  title: z.string(),
  scoringMode: scoringModeSchema,
  members: z.array(
    z.object({
      memberId: z.string(),
      displayName: z.string(),
      division: z.enum(['A', 'B']),
      points: z.number(),
    }),
  ),
})

export type AdminChallenge = z.infer<typeof adminChallengeSchema>

/** Admin/setter completion-scoring body: per-member awarded points. */
export const challengeScoresSchema = z
  .object({
    scores: z
      .array(z.object({ memberId: z.string().min(1), points: z.number().min(0).max(1000) }))
      .max(200),
  })
  .strict()

export type ChallengeScoresInput = z.infer<typeof challengeScoresSchema>

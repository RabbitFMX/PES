import { z } from 'zod'

/**
 * Request/response shapes for the Challenges API (chunk 10), matching the
 * frontend `ChallengeData` / `ChallengeSubmissionRow` / `PastChallenge` types.
 */

/** A ranked submission row shown under the current challenge. */
export const challengeSubmissionRowSchema = z.object({
  memberId: z.string(),
  displayName: z.string(),
  value: z.number(),
  rank: z.number().nullable(),
  bonusPoints: z.number(),
})

export const challengeDataSchema = z.object({
  id: z.string().nullable(),
  title: z.string(),
  description: z.string(),
  deadline: z.string(),
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
    title: z.string().min(1),
    description: z.string().default(''),
    deadline: z.string().datetime({ offset: true }),
    bonusSplit: z.array(z.number().nonnegative()).min(1).optional(),
  })
  .strict()

export type ChallengeCreateInput = z.infer<typeof challengeCreateSchema>

/** Submit-a-value body. */
export const submissionCreateSchema = z.object({ value: z.number() }).strict()

export type SubmissionCreateInput = z.infer<typeof submissionCreateSchema>

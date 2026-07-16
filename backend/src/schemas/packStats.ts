import { z } from 'zod'

/**
 * Whole-pack comparison stats (the "Statistiky" tab): all-time ranking, per-round
 * group activity + winners, and a per-member per-round matrix for the compare
 * chart. Everything is derived at query time from log_entry across ALL rounds.
 */

export const packStatsSchema = z.object({
  totals: z.object({
    rounds: z.number(),
    members: z.number(),
    allTimePoints: z.number(),
    currentRoundName: z.string().nullable(),
  }),
  /** Members ranked by lifetime points, best first. */
  allTime: z.array(
    z.object({
      memberId: z.string(),
      displayName: z.string(),
      avatarUrl: z.string().nullable(),
      division: z.enum(['A', 'B']),
      lifetimePoints: z.number(),
      roundsPlayed: z.number(),
      wins: z.number(),
    }),
  ),
  /** Rounds in chronological order (oldest first). */
  rounds: z.array(
    z.object({
      roundId: z.string(),
      name: z.string(),
      status: z.enum(['upcoming', 'open', 'closed']),
      startDate: z.string(),
      groupTotal: z.number(),
      participants: z.number(),
      winner: z
        .object({ memberId: z.string(), displayName: z.string(), total: z.number() })
        .nullable(),
    }),
  ),
  /** Per-member totals aligned to `rounds` order (null = did not play). */
  roundTotals: z.array(
    z.object({
      memberId: z.string(),
      displayName: z.string(),
      totals: z.array(z.number().nullable()),
    }),
  ),
})

export type PackStats = z.infer<typeof packStatsSchema>

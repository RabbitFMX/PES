import { z } from 'zod'

/**
 * The leaderboard payload the frontend expects (`LeaderboardData` /
 * `LeaderboardRow` in frontend/src/lib/types.ts). Returned by
 * GET /api/leaderboard: current-round standings split into the two packs
 * (division A / B), each a list ordered best-first.
 */
export const leaderboardRowSchema = z.object({
  memberId: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  rank: z.number(),
  roundTotal: z.number(),
  goalMetThisWeek: z.boolean(),
  isCurrentUser: z.boolean(),
})

export type LeaderboardRow = z.infer<typeof leaderboardRowSchema>

export const leaderboardDataSchema = z.object({
  packA: z.array(leaderboardRowSchema),
  packB: z.array(leaderboardRowSchema),
})

export type LeaderboardData = z.infer<typeof leaderboardDataSchema>

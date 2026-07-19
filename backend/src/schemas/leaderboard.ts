import { z } from 'zod'

/**
 * The leaderboard payload the frontend expects (`LeaderboardData` /
 * `LeaderboardRow` in frontend/src/lib/types.ts). Returned by
 * GET /api/leaderboard: current-round standings split into the two packs
 * (division A / B), each a list ordered best-first.
 */
/** A member's per-activity points for the selected round (Přehled-style breakdown). */
export const leaderboardActivityPointsSchema = z.object({
  activityId: z.string().nullable(), // null = quick-add bucket
  nameCs: z.string(),
  nameEn: z.string(),
  points: z.number(),
})

export const leaderboardRowSchema = z.object({
  memberId: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  rank: z.number(),
  roundTotal: z.number(),
  goalMetThisWeek: z.boolean(),
  isCurrentUser: z.boolean(),
  /** Per-activity points in the selected round (for the expandable breakdown). */
  pointsByActivity: z.array(leaderboardActivityPointsSchema),
})

export type LeaderboardRow = z.infer<typeof leaderboardRowSchema>

export const leaderboardDataSchema = z.object({
  /** The round these standings are for (selected, else open, else most recent). */
  roundId: z.string().nullable(),
  roundName: z.string(),
  /** True when the shown round is the live/open one (goal column is meaningful). */
  isOpenRound: z.boolean(),
  packA: z.array(leaderboardRowSchema),
  packB: z.array(leaderboardRowSchema),
})

export type LeaderboardData = z.infer<typeof leaderboardDataSchema>

/** The rounds a member can browse in the leaderboard filter. */
export const roundOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['upcoming', 'open', 'closed']),
  startDate: z.string(),
  endDate: z.string(),
})

export type RoundOption = z.infer<typeof roundOptionSchema>

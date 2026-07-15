import { z } from 'zod'

/**
 * The dashboard payload the frontend expects (`DashboardData` in
 * frontend/src/lib/types.ts). Returned by GET /api/dashboard: the logged-in
 * member's current-week summary — weekly progress vs the 100 goal, round total,
 * pack rank, 100+ streak, and a pointer to this week's challenge.
 */
export const dashboardDataSchema = z.object({
  weeklyPoints: z.number(),
  weeklyGoal: z.number(),
  roundTotal: z.number(),
  packRank: z.number(),
  packSize: z.number(),
  streakWeeks: z.number(),
  currentChallenge: z
    .object({
      id: z.string(),
      title: z.string(),
      hasSubmitted: z.boolean(),
    })
    .nullable(),
})

export type DashboardData = z.infer<typeof dashboardDataSchema>

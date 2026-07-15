import { z } from 'zod'

/**
 * The My-Stats payload the frontend expects (`StatsData` / `StatsRecords` in
 * frontend/src/lib/types.ts). Returned by GET /api/stats: a member's long-term
 * records plus behavioural-pattern series for the Stats screen.
 *
 * Day labels are the frontend's Mon-first three-letter set (mockApi `DOW`).
 */
export const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

const dayPointSchema = z.object({ day: z.string(), points: z.number() })
const datePointSchema = z.object({ date: z.string(), points: z.number() })

export const statsRecordsSchema = z.object({
  bestWeek: z.number(),
  bestRoundFinish: z.string(),
  favouriteActivity: z.string(),
  lifetimePoints: z.number(),
  longestStreakWeeks: z.number(),
  totalKmAllTime: z.number(),
  weeksAtGoal: z.number(),
})

export const statsDataSchema = z.object({
  records: statsRecordsSchema,
  pointsOverTime: z.array(datePointSchema),
  pointsByDayOfWeek: z.array(dayPointSchema),
  routineDetected: z.string().nullable(),
  currentWeekByDay: z.array(dayPointSchema),
})

export type StatsData = z.infer<typeof statsDataSchema>

/** Query params for GET /api/stats — an optional round to scope the line chart. */
export const statsQuerySchema = z.object({
  roundId: z.string().min(1).optional(),
})

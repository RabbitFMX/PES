import { z } from 'zod'

/** A row in the members directory (view-others entry point). */
export const memberDirectoryEntrySchema = z.object({
  id: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  division: z.enum(['A', 'B']),
  status: z.enum(['active', 'left']),
  isHistorical: z.boolean(),
  lifetimePoints: z.number(),
})
export type MemberDirectoryEntry = z.infer<typeof memberDirectoryEntrySchema>

const activityPoints = z.object({
  activityId: z.string(),
  nameCs: z.string(),
  nameEn: z.string(),
  points: z.number(),
})

/** A member's personal overview (the Přehled tab; also shown to other members). */
export const memberOverviewSchema = z.object({
  member: z.object({
    id: z.string(),
    displayName: z.string(),
    avatarUrl: z.string().nullable(),
    division: z.enum(['A', 'B']),
    isHistorical: z.boolean(),
  }),
  /** Current open week snapshot. */
  weekly: z.object({
    weeklyPoints: z.number(),
    weeklyGoal: z.number(),
    streakWeeks: z.number(),
  }),
  /** Every entry logged in the current open week, with detail (distance/reps/elevation). */
  currentWeekActivities: z.array(
    z.object({
      activityName: z.string().nullable(), // null = quick-add (no rate-table activity)
      quantity: z.number(),
      unit: z.string(),
      elevationM: z.number(),
      points: z.number(),
      date: z.string(),
    }),
  ),
  records: z.object({
    lifetimePoints: z.number(),
    roundsPlayed: z.number(),
    bestWeek: z.number(),
    longestStreakWeeks: z.number(),
    weeksAtGoal: z.number(),
    /** Weeks the member logged something but stayed under the 100 goal. */
    weeksBelowGoal: z.number(),
    /** Weeks with any points logged (denominator for the average). */
    weeksLogged: z.number(),
    /** Mean points across logged weeks. */
    avgWeeklyPoints: z.number(),
    favouriteActivity: z.string(),
    totalKm: z.number(),
    totalElevation: z.number(),
  }),
  /** The single best week: which round/week, its points, and its activity split. */
  bestWeekDetail: z
    .object({
      roundName: z.string(),
      weekNumber: z.number(),
      weekStart: z.string(),
      points: z.number(),
      activities: z.array(
        z.object({
          activityId: z.string().nullable(),
          activityName: z.string().nullable(),
          points: z.number(),
        }),
      ),
    })
    .nullable(),
  /** All lifetime points split by activity (incl. a quick-add bucket) — for the pie. */
  pointsByActivity: z.array(activityPoints),
  /** Top activities by points (up to 10). */
  topActivities: z.array(activityPoints),
  roundHistory: z.array(z.object({ roundId: z.string(), name: z.string(), total: z.number() })),
  pointsByDayOfWeek: z.array(z.object({ day: z.string(), points: z.number() })),
  distanceByActivity: z.array(
    z.object({ activityId: z.string(), nameCs: z.string(), nameEn: z.string(), km: z.number() }),
  ),
  elevationByActivity: z.array(
    z.object({ activityId: z.string(), nameCs: z.string(), nameEn: z.string(), m: z.number() }),
  ),
  /** Cumulative km & elevation after each active week (detailed entries only). */
  cumulative: z.array(z.object({ weekStart: z.string(), km: z.number(), elevation: z.number() })),
})

export type MemberOverview = z.infer<typeof memberOverviewSchema>

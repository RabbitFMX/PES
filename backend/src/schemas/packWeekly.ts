import { z } from 'zod'

/**
 * Per-week, per-member points for ONE round — backs the "compare members by
 * week" chart on the Statistiky tab. `weekly` is aligned to `weeks` (same order,
 * null where the member logged nothing that week).
 */
export const packWeeklySchema = z.object({
  roundId: z.string(),
  roundName: z.string(),
  weeks: z.array(z.object({ weekNumber: z.number() })),
  members: z.array(
    z.object({
      memberId: z.string(),
      displayName: z.string(),
      weekly: z.array(z.number().nullable()),
    }),
  ),
})

export type PackWeekly = z.infer<typeof packWeeklySchema>

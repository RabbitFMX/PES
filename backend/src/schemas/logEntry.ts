import { z } from 'zod'

/** Detailed-mode log entry input, per project-brief.md §13/§22 Feature 1. */
export const logEntrySchema = z.object({
  activityId: z.string(),
  quantity: z.number().positive(),
  elevationM: z.number().nonnegative().optional(),
  withStroller: z.boolean().optional(),
  activityDate: z.string().date().optional(),
  note: z.string().max(500).optional(),
})

export type LogEntryInput = z.infer<typeof logEntrySchema>

import { z } from 'zod'
import type { LogEntryRow } from '../db/types'

/**
 * Request/response shapes for the log-activity API (chunk 6). Two write modes
 * share these endpoints: **detailed** (an activity + quantity, with optional
 * elevation/stroller/date) and **quick-add** (a raw point value). Natural
 * -language parsing is deferred to seminar 6.
 */

/** Detailed-mode input, per project-brief §13/§22 Feature 1. */
export const detailedLogInputSchema = z
  .object({
    activityId: z.string().min(1),
    quantity: z.number().positive(),
    elevationM: z.number().nonnegative().optional(),
    withStroller: z.boolean().optional(),
    activityDate: z.string().date().optional(),
    note: z.string().max(500).optional(),
  })
  .strict()

/** Quick-add input: the member types a raw point value directly (§25). */
export const quickAddInputSchema = z
  .object({
    points: z.number().positive(),
    note: z.string().max(500).optional(),
  })
  .strict()

/**
 * A log request is either a detailed entry or a quick-add. Quick-add is tried
 * first (it requires `points`); a body with `activityId` falls through to the
 * detailed shape. A body matching neither fails validation → 400.
 */
export const logInputSchema = z.union([quickAddInputSchema, detailedLogInputSchema])

export type DetailedLogInput = z.infer<typeof detailedLogInputSchema>
export type QuickAddInput = z.infer<typeof quickAddInputSchema>
export type LogInput = z.infer<typeof logInputSchema>

/** True when the input is a quick-add (has `points`) rather than a detailed entry. */
export function isQuickAdd(input: LogInput): input is QuickAddInput {
  return 'points' in input
}

/**
 * The confirm-before-save preview the log modal shows (`LogPreview` in
 * frontend/src/lib/types.ts). Points are always computed server-side.
 */
export const logPreviewSchema = z.object({
  activityName: z.string(),
  quantity: z.number(),
  unit: z.string(),
  rawPoints: z.number(),
  coefficient: z.number(),
  finalPoints: z.number(),
})

export type LogPreview = z.infer<typeof logPreviewSchema>

/** A saved log entry, mapped to camelCase for the client. */
export const savedLogEntrySchema = z.object({
  id: z.string(),
  activityId: z.string().nullable(),
  activityDate: z.string(),
  quantity: z.number(),
  unit: z.string(),
  elevationM: z.number().nullable(),
  withStroller: z.boolean(),
  rawPoints: z.number(),
  finalPoints: z.number(),
  source: z.enum(['manual', 'quick-add', 'llm']),
  note: z.string().nullable(),
})

export type SavedLogEntry = z.infer<typeof savedLogEntrySchema>

/**
 * The commit response: the saved entries, the member's new weekly total, and a
 * soft `duplicate` flag (identical entry already existed — still saved).
 */
export const logCommitResultSchema = z.object({
  entries: z.array(savedLogEntrySchema),
  weeklyPoints: z.number(),
  duplicate: z.boolean(),
})

export type LogCommitResult = z.infer<typeof logCommitResultSchema>

/** Map a saved DB row to the camelCase client shape (validated). */
export function toSavedLogEntry(row: LogEntryRow): SavedLogEntry {
  return savedLogEntrySchema.parse({
    id: row.id,
    activityId: row.activity_id,
    activityDate: row.activity_date,
    quantity: Number(row.quantity),
    unit: row.unit,
    elevationM: row.elevation_m === null ? null : Number(row.elevation_m),
    withStroller: row.with_stroller,
    rawPoints: Number(row.raw_points),
    finalPoints: Number(row.final_points),
    source: row.source,
    note: row.note,
  })
}

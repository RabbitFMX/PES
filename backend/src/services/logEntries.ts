import { getActivity } from '../db/activities'
import {
  deleteLogEntry,
  getLogEntryById,
  getWeeklyTotalPoints,
  hasDuplicateEntry,
  insertLogEntries,
  updateLogEntry,
} from '../db/logEntries'
import { getCurrentWeek } from '../db/weeks'
import type { LogEntryRow, MemberRow, NewLogEntry } from '../db/types'
import { HttpError } from '../middleware/errorHandler'
import { toActivity } from '../schemas/activity'
import {
  isQuickAdd,
  toSavedLogEntry,
  type LogCommitResult,
  type LogInput,
  type LogPreview,
  type SavedLogEntry,
} from '../schemas/logEntry'
import { applyCoefficient, computeRawPoints } from './points'

/**
 * Business logic for the log-activity write path (chunk 6). Points are always
 * computed here (never trusted from the client) for both preview and commit.
 * No Express types leak in; the router is thin glue over these functions.
 */

/** Label shown for quick-add entries (mirrors the frontend mock). */
const QUICK_ADD_NAME = 'Rychlý zápis'

/** Today as an ISO `YYYY-MM-DD` string (the default activity date). */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Resolve raw + final points and the preview shape for an input. */
async function computePreview(input: LogInput, member: MemberRow): Promise<LogPreview> {
  const coefficient = Number(member.coefficient)

  if (isQuickAdd(input)) {
    // Quick-add: the raw points ARE the entered value; ×1.25 still applies (§25).
    return {
      activityName: QUICK_ADD_NAME,
      quantity: input.points,
      unit: 'pts',
      rawPoints: input.points,
      coefficient,
      finalPoints: applyCoefficient(input.points, coefficient),
    }
  }

  const row = await getActivity(input.activityId)
  if (!row) throw new HttpError(404, 'unknown_activity')
  const activity = toActivity(row)

  const raw = computeRawPoints(
    activity,
    input.quantity,
    input.elevationM ?? 0,
    input.withStroller ?? false,
  )
  return {
    activityName: activity.nameCs,
    quantity: input.quantity,
    unit: activity.unit,
    rawPoints: raw,
    coefficient,
    finalPoints: applyCoefficient(raw, coefficient),
  }
}

/** POST /api/log-entries/preview — compute points, no DB write. */
export async function previewLogEntry(input: LogInput, member: MemberRow): Promise<LogPreview> {
  return computePreview(input, member)
}

/**
 * POST /api/log-entries — recompute server-side, resolve the current open week,
 * persist the entry, and return the saved row(s), the member's new weekly total,
 * and a soft duplicate flag. Entries dated outside the open week are rejected.
 */
export async function commitLogEntry(input: LogInput, member: MemberRow): Promise<LogCommitResult> {
  const preview = await computePreview(input, member)

  // Every entry belongs to the currently open week.
  const week = await getCurrentWeek(todayIso())
  if (!week) throw new HttpError(409, 'no_open_week')

  const quickAdd = isQuickAdd(input)
  // Quick-add is always dated today; detailed defaults to today, editable within
  // the open week.
  const activityDate = quickAdd ? todayIso() : (input.activityDate ?? todayIso())
  if (activityDate < week.start_date || activityDate > week.end_date) {
    throw new HttpError(400, 'date_outside_week')
  }

  const activityId = quickAdd ? null : input.activityId
  const duplicate = await hasDuplicateEntry(member.id, activityId, activityDate, preview.quantity)

  const row: NewLogEntry = {
    member_id: member.id,
    week_id: week.id,
    activity_id: activityId,
    activity_date: activityDate,
    quantity: preview.quantity,
    unit: preview.unit,
    elevation_m: quickAdd ? null : (input.elevationM ?? null),
    with_stroller: quickAdd ? false : (input.withStroller ?? false),
    raw_points: preview.rawPoints,
    final_points: preview.finalPoints,
    source: quickAdd ? 'quick-add' : 'manual',
    note: input.note ?? null,
  }

  const saved = await insertLogEntries([row])
  const weeklyPoints = await getWeeklyTotalPoints(member.id, week.id)

  return { entries: saved.map(toSavedLogEntry), weeklyPoints, duplicate }
}

/**
 * Load an entry and assert the member may mutate it: it must exist, belong to
 * the caller, and sit in the currently open week (edits/deletes are limited to
 * the current week, matching the create path). Returns the row + open week.
 */
async function ownedCurrentWeekEntry(
  id: string,
  member: MemberRow,
): Promise<{ entry: LogEntryRow; weekId: string; weekStart: string; weekEnd: string }> {
  const entry = await getLogEntryById(id)
  if (!entry) throw new HttpError(404, 'entry_not_found')
  // Same 404 for "not yours" so we never reveal another member's entry exists.
  if (entry.member_id !== member.id) throw new HttpError(404, 'entry_not_found')

  const week = await getCurrentWeek(todayIso())
  if (!week) throw new HttpError(409, 'no_open_week')
  if (entry.week_id !== week.id) throw new HttpError(403, 'not_current_week')

  return { entry, weekId: week.id, weekStart: week.start_date, weekEnd: week.end_date }
}

/**
 * GET /api/log-entries/:id — the owner loads one of their entries (all fields,
 * incl. note) to prefill the edit form. 404 for missing OR not-owned (no leak).
 */
export async function getOwnLogEntry(id: string, member: MemberRow): Promise<SavedLogEntry> {
  const entry = await getLogEntryById(id)
  if (!entry || entry.member_id !== member.id) throw new HttpError(404, 'entry_not_found')
  return toSavedLogEntry(entry)
}

/**
 * PATCH /api/log-entries/:id — the owner edits one of their current-week
 * entries. Points are recomputed server-side; the entry stays in the same week.
 */
export async function editLogEntry(
  id: string,
  input: LogInput,
  member: MemberRow,
): Promise<LogCommitResult> {
  const { weekId, weekStart, weekEnd } = await ownedCurrentWeekEntry(id, member)
  const preview = await computePreview(input, member)

  const quickAdd = isQuickAdd(input)
  const activityDate = quickAdd ? todayIso() : (input.activityDate ?? todayIso())
  if (activityDate < weekStart || activityDate > weekEnd) {
    throw new HttpError(400, 'date_outside_week')
  }

  const updated = await updateLogEntry(id, {
    activity_id: quickAdd ? null : input.activityId,
    activity_date: activityDate,
    quantity: preview.quantity,
    unit: preview.unit,
    elevation_m: quickAdd ? null : (input.elevationM ?? null),
    with_stroller: quickAdd ? false : (input.withStroller ?? false),
    raw_points: preview.rawPoints,
    final_points: preview.finalPoints,
    source: quickAdd ? 'quick-add' : 'manual',
    note: input.note ?? null,
  })
  if (!updated) throw new HttpError(404, 'entry_not_found')

  const weeklyPoints = await getWeeklyTotalPoints(member.id, weekId)
  return { entries: [toSavedLogEntry(updated)], weeklyPoints, duplicate: false }
}

/**
 * DELETE /api/log-entries/:id — the owner removes one of their current-week
 * entries. Returns the member's new weekly total.
 */
export async function removeLogEntry(
  id: string,
  member: MemberRow,
): Promise<{ weeklyPoints: number }> {
  const { weekId } = await ownedCurrentWeekEntry(id, member)
  await deleteLogEntry(id)
  const weeklyPoints = await getWeeklyTotalPoints(member.id, weekId)
  return { weeklyPoints }
}

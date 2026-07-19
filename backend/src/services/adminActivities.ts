import {
  countActivityLogEntries,
  deleteActivity as deleteActivityRow,
  getActivity,
  insertActivity,
  listAllActivities,
  updateActivity,
} from '../db/activities'
import type { ActivityRow } from '../db/types'
import { toActivity, type Activity } from '../schemas/activity'
import type { ActivityCreateInput, ActivityPatchInput, AdminResult } from '../schemas/admin'

/** Admin rate-table editor (chunk 11). */

/** GET /api/admin/activities — every activity, including inactive, full fields. */
export async function getActivities(): Promise<Activity[]> {
  const rows = await listAllActivities()
  return rows.map(toActivity)
}

/**
 * POST /api/admin/activities — create a new rate-table row. A duplicate name
 * within a language is a soft warning (annotated on the ok result), not a
 * rejection.
 */
export async function createActivity(input: ActivityCreateInput): Promise<AdminResult> {
  const existing = await listAllActivities()
  const dupCs = existing.some((a) => a.name_cs.toLowerCase() === input.nameCs.toLowerCase())
  const dupEn = existing.some((a) => a.name_en.toLowerCase() === input.nameEn.toLowerCase())

  const row: ActivityRow = {
    id: input.id,
    name_cs: input.nameCs,
    name_en: input.nameEn,
    unit: input.unit,
    points_per_unit: input.pointsPerUnit,
    has_elevation_bonus: input.hasElevationBonus,
    elevation_bonus_per_50m: input.elevationBonusPer50m,
    elevation_bonus_per_50m_stroller: input.elevationBonusPer50mStroller,
    has_stroller_option: input.hasStrollerOption,
    stroller_base_rate_override: input.strollerBaseRateOverride,
    is_tiered: input.isTiered,
    tier_options: input.tierOptions,
    notes: input.notes,
    active: input.active,
  }
  await insertActivity(row)

  if (dupCs || dupEn) {
    const lang = dupCs && dupEn ? 'Czech and English' : dupCs ? 'Czech' : 'English'
    return { ok: true, warning: `Another activity already uses this ${lang} name.` }
  }
  return { ok: true }
}

/** PATCH /api/admin/activities/:id — edit rates/flags/active. */
export async function editActivity(id: string, patch: ActivityPatchInput): Promise<AdminResult> {
  const update: Partial<Omit<ActivityRow, 'id'>> = {}
  if (patch.nameCs !== undefined) update.name_cs = patch.nameCs
  if (patch.nameEn !== undefined) update.name_en = patch.nameEn
  if (patch.unit !== undefined) update.unit = patch.unit
  if (patch.pointsPerUnit !== undefined) update.points_per_unit = patch.pointsPerUnit
  if (patch.hasElevationBonus !== undefined) update.has_elevation_bonus = patch.hasElevationBonus
  if (patch.elevationBonusPer50m !== undefined)
    update.elevation_bonus_per_50m = patch.elevationBonusPer50m
  if (patch.elevationBonusPer50mStroller !== undefined)
    update.elevation_bonus_per_50m_stroller = patch.elevationBonusPer50mStroller
  if (patch.hasStrollerOption !== undefined) update.has_stroller_option = patch.hasStrollerOption
  if (patch.strollerBaseRateOverride !== undefined)
    update.stroller_base_rate_override = patch.strollerBaseRateOverride
  if (patch.isTiered !== undefined) update.is_tiered = patch.isTiered
  if (patch.tierOptions !== undefined) update.tier_options = patch.tierOptions
  if (patch.notes !== undefined) update.notes = patch.notes
  if (patch.active !== undefined) update.active = patch.active

  const updated = await updateActivity(id, update)
  return updated ? { ok: true } : { ok: false, message: 'Activity not found.' }
}

/**
 * DELETE /api/admin/activities/:id — hard-delete a rate-table row. Refused for
 * activities that already have log entries (a `log_entry.activity_id` FK is
 * `on delete restrict`); the admin should deactivate those instead. Returns a
 * sentinel message the frontend localises (`in_use` / `not_found`).
 */
export async function deleteActivity(id: string): Promise<AdminResult> {
  const existing = await getActivity(id)
  if (!existing) return { ok: false, message: 'not_found' }

  const uses = await countActivityLogEntries(id)
  if (uses > 0) return { ok: false, message: 'in_use' }

  await deleteActivityRow(id)
  return { ok: true }
}

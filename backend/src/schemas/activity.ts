import { z } from 'zod'
import type { ActivityRow } from '../db/types'

/**
 * The activity payload the frontend expects (`Activity` in
 * frontend/src/lib/types.ts). Returned by GET /api/activities so the
 * log-activity modal and admin rate-table editor can read the live rate table.
 *
 * The full rate fields (points_per_unit, elevation/stroller rates) are included
 * as well as the display fields — the frontend `Activity` shape carries them
 * all, so shipping the whole row keeps the Phase-1 mock → API swap (chunk 12) a
 * one-file change. Points are still calculated server-side; these fields are
 * read-only reference data for the client.
 */
export const activitySchema = z.object({
  id: z.string(),
  nameCs: z.string(),
  nameEn: z.string(),
  unit: z.string(),
  pointsPerUnit: z.number(),
  hasElevationBonus: z.boolean(),
  elevationBonusPer50m: z.number().nullable(),
  elevationBonusPer50mStroller: z.number().nullable(),
  hasStrollerOption: z.boolean(),
  strollerBaseRateOverride: z.number().nullable(),
  isTiered: z.boolean(),
  tierOptions: z.array(z.number()).nullable(),
  notes: z.string().nullable(),
  active: z.boolean(),
})

export type Activity = z.infer<typeof activitySchema>

/**
 * Map a DB activity row (snake_case) to the camelCase `Activity` shape
 * (validated). This is the single place snake_case → camelCase happens for
 * activities, so every endpoint that returns activities stays consistent.
 */
export function toActivity(row: ActivityRow): Activity {
  return activitySchema.parse({
    id: row.id,
    nameCs: row.name_cs,
    nameEn: row.name_en,
    unit: row.unit,
    // numeric columns can arrive as strings from the driver — normalise.
    pointsPerUnit: Number(row.points_per_unit),
    hasElevationBonus: row.has_elevation_bonus,
    elevationBonusPer50m:
      row.elevation_bonus_per_50m === null ? null : Number(row.elevation_bonus_per_50m),
    elevationBonusPer50mStroller:
      row.elevation_bonus_per_50m_stroller === null
        ? null
        : Number(row.elevation_bonus_per_50m_stroller),
    hasStrollerOption: row.has_stroller_option,
    strollerBaseRateOverride:
      row.stroller_base_rate_override === null ? null : Number(row.stroller_base_rate_override),
    isTiered: row.is_tiered,
    tierOptions: row.tier_options,
    notes: row.notes,
    active: row.active,
  })
}

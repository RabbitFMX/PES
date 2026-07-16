import { z } from 'zod'
import type { MemberRow, RoundRow } from '../db/types'

/**
 * Request/response shapes for the Admin API (chunk 11), matching the frontend
 * `Member` / `Round` / `RotationEntry` types. Every mutating endpoint returns
 * the uniform `AdminResult` so the frontend's save-confirmation / failure-toast
 * pattern is consistent.
 */

/** Uniform write response. `warning` is a non-fatal note on an otherwise-ok write. */
export type AdminResult = { ok: true; warning?: string } | { ok: false; message: string }

/* ---- Members ---- */

export const memberSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  email: z.string(),
  division: z.enum(['A', 'B']),
  coefficient: z.number(),
  role: z.enum(['member', 'admin']),
  status: z.enum(['active', 'left']),
  injuryExemptUntil: z.string().nullable(),
  isHistorical: z.boolean(),
})

export type Member = z.infer<typeof memberSchema>

export function toMember(row: MemberRow): Member {
  return memberSchema.parse({
    id: row.id,
    displayName: row.name,
    email: row.email,
    division: row.division,
    coefficient: Number(row.coefficient),
    role: row.role,
    status: row.status,
    injuryExemptUntil: row.injury_exempt_until,
    isHistorical: row.is_historical ?? false,
  })
}

export const memberInviteSchema = z.object({ email: z.string().email() }).strict()

/** POST /api/admin/members/merge — fold a historical member into a real account. */
export const memberMergeSchema = z
  .object({ targetId: z.string().min(1), historicalId: z.string().min(1) })
  .strict()

export type MemberMergeInput = z.infer<typeof memberMergeSchema>

const coefficientSchema = z.union([z.literal(1), z.literal(1.25)])

export const memberPatchSchema = z
  .object({
    division: z.enum(['A', 'B']).optional(),
    coefficient: coefficientSchema.optional(),
    role: z.enum(['member', 'admin']).optional(),
    status: z.enum(['active', 'left']).optional(),
    injuryExemptUntil: z.string().date().nullable().optional(),
  })
  .strict()

export type MemberPatchInput = z.infer<typeof memberPatchSchema>

/* ---- Activities ---- */

/** Shared rate-table fields (create requires the names; patch makes all optional). */
const activityBase = {
  nameCs: z.string().min(1),
  nameEn: z.string().min(1),
  unit: z.string().min(1),
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
}

/** Tiered activities must carry at least one preset value. */
function requireTierOptions(
  val: { isTiered?: boolean; tierOptions?: number[] | null },
  ctx: z.RefinementCtx,
): void {
  if (val.isTiered === true && val.tierOptions !== undefined) {
    if (val.tierOptions === null || val.tierOptions.length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['tierOptions'],
        message: 'Tiered activities need at least one tierOptions value',
      })
    }
  }
}

export const activityCreateSchema = z
  .object({
    id: z.string().min(1),
    ...activityBase,
    pointsPerUnit: z.number().default(0),
    hasElevationBonus: z.boolean().default(false),
    elevationBonusPer50m: z.number().nullable().default(null),
    elevationBonusPer50mStroller: z.number().nullable().default(null),
    hasStrollerOption: z.boolean().default(false),
    strollerBaseRateOverride: z.number().nullable().default(null),
    isTiered: z.boolean().default(false),
    tierOptions: z.array(z.number()).nullable().default(null),
    notes: z.string().nullable().default(null),
    active: z.boolean().default(true),
  })
  .strict()
  .superRefine((val, ctx) => {
    // On create, isTiered defaults to false; a tiered create must have options.
    if (val.isTiered && (!val.tierOptions || val.tierOptions.length < 1)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['tierOptions'],
        message: 'Tiered activities need at least one tierOptions value',
      })
    }
  })

export type ActivityCreateInput = z.infer<typeof activityCreateSchema>

export const activityPatchSchema = z
  .object({
    nameCs: activityBase.nameCs.optional(),
    nameEn: activityBase.nameEn.optional(),
    unit: activityBase.unit.optional(),
    pointsPerUnit: activityBase.pointsPerUnit.optional(),
    hasElevationBonus: activityBase.hasElevationBonus.optional(),
    elevationBonusPer50m: activityBase.elevationBonusPer50m.optional(),
    elevationBonusPer50mStroller: activityBase.elevationBonusPer50mStroller.optional(),
    hasStrollerOption: activityBase.hasStrollerOption.optional(),
    strollerBaseRateOverride: activityBase.strollerBaseRateOverride.optional(),
    isTiered: activityBase.isTiered.optional(),
    tierOptions: activityBase.tierOptions.optional(),
    notes: activityBase.notes.optional(),
    active: activityBase.active.optional(),
  })
  .strict()
  .superRefine(requireTierOptions)

export type ActivityPatchInput = z.infer<typeof activityPatchSchema>

/* ---- Rounds ---- */

export const roundSchema = z.object({
  id: z.string(),
  name: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  status: z.enum(['upcoming', 'open', 'closed']),
})

export type Round = z.infer<typeof roundSchema>

export function toRound(row: RoundRow): Round {
  return roundSchema.parse({
    id: row.id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
  })
}

export const roundCreateSchema = z
  .object({
    name: z.string().min(1),
    startDate: z.string().date(),
    endDate: z.string().date(),
  })
  .strict()
  .refine((v) => v.endDate >= v.startDate, {
    path: ['endDate'],
    message: 'endDate must be on or after startDate',
  })

export type RoundCreateInput = z.infer<typeof roundCreateSchema>

export const roundPatchSchema = z
  .object({
    name: z.string().min(1).optional(),
    startDate: z.string().date().optional(),
    endDate: z.string().date().optional(),
    status: z.enum(['upcoming', 'open', 'closed']).optional(),
  })
  .strict()

export type RoundPatchInput = z.infer<typeof roundPatchSchema>

/* ---- Rotation ---- */

export const rotationEntrySchema = z.object({
  memberId: z.string(),
  displayName: z.string(),
  orderPosition: z.number(),
})

export type RotationEntryOut = z.infer<typeof rotationEntrySchema>

/** PUT body: the reordered list of member ids (order = new positions). */
export const rotationPutSchema = z.object({ memberIds: z.array(z.string()) }).strict()

export type RotationPutInput = z.infer<typeof rotationPutSchema>

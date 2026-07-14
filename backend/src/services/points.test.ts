import { describe, expect, it } from 'vitest'
import { applyCoefficient, computeRawPoints, round2 } from './points'
import type { Activity } from '../schemas/activity'

// Fixtures mirror the seeded rate table (§14) so the cases match
// frontend/src/lib/mockPoints.ts exactly.
const run: Activity = {
  id: 'run',
  nameCs: 'běh',
  nameEn: 'Running',
  unit: 'km',
  pointsPerUnit: 3,
  hasElevationBonus: true,
  elevationBonusPer50m: 1.5,
  elevationBonusPer50mStroller: 2.5,
  hasStrollerOption: true,
  strollerBaseRateOverride: null,
  isTiered: false,
  tierOptions: null,
  notes: null,
  active: true,
}

const hike: Activity = {
  ...run,
  id: 'hike',
  nameCs: 'túra',
  nameEn: 'Hike',
  pointsPerUnit: 1.5,
  elevationBonusPer50m: 1,
  elevationBonusPer50mStroller: 2,
  strollerBaseRateOverride: 2, // base rate changes with a child carrier
}

const exercise: Activity = {
  ...run,
  id: 'exercise',
  nameCs: 'cvičení různé',
  unit: 'pts',
  pointsPerUnit: 0,
  hasElevationBonus: false,
  elevationBonusPer50m: null,
  elevationBonusPer50mStroller: null,
  hasStrollerOption: false,
  isTiered: true,
  tierOptions: [5, 10, 15, 30],
}

describe('computeRawPoints', () => {
  it('detailed: 8 km run = 24', () => {
    expect(computeRawPoints(run, 8)).toBe(24)
  })

  it('detailed: 8 km run + 200 m elevation = 30', () => {
    // 24 + (200/50)*1.5 = 24 + 6
    expect(computeRawPoints(run, 8, 200)).toBe(30)
  })

  it('detailed: 8 km run + 200 m with a stroller uses the stroller elevation rate = 34', () => {
    // 24 + (200/50)*2.5 = 24 + 10
    expect(computeRawPoints(run, 8, 200, true)).toBe(34)
  })

  it('detailed: túra applies the stroller base-rate override (1.5 → 2 b/km)', () => {
    expect(computeRawPoints(hike, 10)).toBe(15) // 10 × 1.5
    expect(computeRawPoints(hike, 10, 0, true)).toBe(20) // 10 × 2 (override)
  })

  it('detailed: túra with stroller combines the override base rate and stroller elevation rate', () => {
    // 10 × 2 + (100/50)*2 = 20 + 4
    expect(computeRawPoints(hike, 10, 100, true)).toBe(24)
  })

  it('no elevation bonus is added when the activity has none or elevation is 0', () => {
    expect(computeRawPoints(run, 8, 0)).toBe(24)
    expect(computeRawPoints(exercise, 15, 200)).toBe(15) // tiered ignores elevation
  })

  it('tiered: the chosen preset value passes through as the raw points', () => {
    expect(computeRawPoints(exercise, 15)).toBe(15)
    expect(computeRawPoints(exercise, 30)).toBe(30)
  })

  it('rounds to 2 decimal places', () => {
    // road cycling 0.7 b/km × 3.333 km = 2.3331 → 2.33
    const bike: Activity = { ...run, id: 'bike-road', pointsPerUnit: 0.7, hasElevationBonus: false }
    expect(computeRawPoints(bike, 3.333)).toBe(2.33)
  })
})

describe('applyCoefficient', () => {
  it('leaves points unchanged at coefficient 1.0', () => {
    expect(applyCoefficient(24, 1.0)).toBe(24)
  })

  it('applies the fenčí koeficient of 1.25 (24 → 30)', () => {
    expect(applyCoefficient(24, 1.25)).toBe(30)
  })

  it('rounds the coefficient result to 2 decimals', () => {
    expect(applyCoefficient(2.33, 1.25)).toBe(2.91) // 2.9125 → 2.91
  })
})

describe('round2', () => {
  it('rounds half up to 2 decimals', () => {
    expect(round2(1.005)).toBe(1.0) // float repr: 1.005 → 1 (documents behaviour)
    expect(round2(24)).toBe(24)
    expect(round2(2.9125)).toBe(2.91)
  })
})

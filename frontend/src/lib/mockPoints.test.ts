import { describe, expect, it } from 'vitest'
import { applyCoefficient, computeRawPoints } from './mockPoints'
import type { Activity } from './types'

const base: Activity = {
  id: 'x',
  nameCs: 'x',
  nameEn: 'x',
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

describe('computeRawPoints', () => {
  it('multiplies quantity by base rate', () => {
    expect(computeRawPoints(base, 8)).toBe(24)
  })

  it('adds elevation bonus per 50m', () => {
    // 8km*3 + (200/50)*1.5 = 24 + 6 = 30
    expect(computeRawPoints(base, 8, 200)).toBe(30)
  })

  it('uses the stroller elevation bonus when with stroller', () => {
    // 24 + (200/50)*2.5 = 24 + 10 = 34
    expect(computeRawPoints(base, 8, 200, true)).toBe(34)
  })

  it('applies a stroller base-rate override (túra 1.5→2)', () => {
    const hike: Activity = { ...base, pointsPerUnit: 1.5, strollerBaseRateOverride: 2 }
    expect(computeRawPoints(hike, 10, 0, true)).toBe(20)
    expect(computeRawPoints(hike, 10, 0, false)).toBe(15)
  })

  it('treats tiered quantity as the preset point value itself', () => {
    const tiered: Activity = { ...base, isTiered: true, tierOptions: [5, 10, 15, 30] }
    expect(computeRawPoints(tiered, 15)).toBe(15)
  })
})

describe('applyCoefficient', () => {
  it('applies the fenčí koeficient', () => {
    expect(applyCoefficient(24, 1.25)).toBe(30)
  })
})

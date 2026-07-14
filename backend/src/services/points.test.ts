import { describe, expect, it } from 'vitest'
import { applyCoefficient } from './points'

describe('applyCoefficient', () => {
  it('leaves points unchanged at coefficient 1.0', () => {
    expect(applyCoefficient(24, 1.0)).toBe(24)
  })

  it('applies the fenčí koeficient of 1.25', () => {
    expect(applyCoefficient(24, 1.25)).toBe(30)
  })
})

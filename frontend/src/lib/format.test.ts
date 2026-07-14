import { describe, expect, it } from 'vitest'
import { formatPoints, goalFraction, ordinal } from './format'

describe('formatPoints', () => {
  it('drops trailing zeros for integers', () => {
    expect(formatPoints(30)).toBe('30')
  })
  it('keeps up to two decimals', () => {
    expect(formatPoints(30.5)).toBe('30.5')
    expect(formatPoints(24 * 1.25)).toBe('30')
  })
})

describe('goalFraction', () => {
  it('is 0.64 at 64/100', () => {
    expect(goalFraction(64, 100)).toBeCloseTo(0.64)
  })
  it('allows overflow above 1', () => {
    expect(goalFraction(120, 100)).toBeCloseTo(1.2)
  })
  it('never goes negative and handles zero goal', () => {
    expect(goalFraction(-5, 100)).toBe(0)
    expect(goalFraction(50, 0)).toBe(0)
  })
})

describe('ordinal', () => {
  it('handles common cases', () => {
    expect(ordinal(1)).toBe('1st')
    expect(ordinal(2)).toBe('2nd')
    expect(ordinal(3)).toBe('3rd')
    expect(ordinal(4)).toBe('4th')
    expect(ordinal(11)).toBe('11th')
    expect(ordinal(22)).toBe('22nd')
  })
})

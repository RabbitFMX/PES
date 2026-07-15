import { describe, expect, it } from 'vitest'
import { computeBonuses, DEFAULT_BONUS_SPLIT } from './challenges'

/** Convenience: map result to [memberId, rank, bonusPoints] triples. */
function triples(rows: ReturnType<typeof computeBonuses>) {
  return rows.map((r) => [r.memberId, r.rank, r.bonusPoints])
}

describe('computeBonuses', () => {
  it('awards 30/20/10 for a clear 1st/2nd/3rd', () => {
    const result = computeBonuses([
      { memberId: 'a', value: 420 },
      { memberId: 'b', value: 355 },
      { memberId: 'c', value: 300 },
    ])
    expect(triples(result)).toEqual([
      ['a', 1, 30],
      ['b', 2, 20],
      ['c', 3, 10],
    ])
  })

  it('splits a 2-way tie for 1st evenly (15/15), then 3rd gets 10', () => {
    // Two tied for 1st share the 1st-place points (30/2 = 15 each); the next
    // member is rank 3 and gets the 3rd-place points. 2nd-place points are not
    // awarded.
    const result = computeBonuses([
      { memberId: 'a', value: 400 },
      { memberId: 'b', value: 400 },
      { memberId: 'c', value: 300 },
    ])
    expect(triples(result)).toEqual([
      ['a', 1, 15],
      ['b', 1, 15],
      ['c', 3, 10],
    ])
  })

  it('splits a 3-way tie for 1st evenly (10/10/10)', () => {
    const result = computeBonuses([
      { memberId: 'a', value: 400 },
      { memberId: 'b', value: 400 },
      { memberId: 'c', value: 400 },
      { memberId: 'd', value: 200 },
    ])
    expect(triples(result)).toEqual([
      ['a', 1, 10],
      ['b', 1, 10],
      ['c', 1, 10],
      ['d', 4, 0], // beyond the split length → no bonus
    ])
  })

  it('handles a tie for 2nd (2nd + no 3rd awarded)', () => {
    // 1st gets 30; two tied for 2nd split the 2nd-place points (20/2 = 10 each);
    // nobody is rank 3.
    const result = computeBonuses([
      { memberId: 'a', value: 500 },
      { memberId: 'b', value: 300 },
      { memberId: 'c', value: 300 },
    ])
    expect(triples(result)).toEqual([
      ['a', 1, 30],
      ['b', 2, 10],
      ['c', 2, 10],
    ])
  })

  it('honours a custom split', () => {
    const result = computeBonuses(
      [
        { memberId: 'a', value: 10 },
        { memberId: 'b', value: 5 },
      ],
      [50, 25],
    )
    expect(triples(result)).toEqual([
      ['a', 1, 50],
      ['b', 2, 25],
    ])
  })

  it('exposes the default split as 30/20/10', () => {
    expect(DEFAULT_BONUS_SPLIT).toEqual([30, 20, 10])
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getPackWeekly } from './packWeekly'

const listRounds = vi.hoisted(() => vi.fn())
const listWeeksByRound = vi.hoisted(() => vi.fn())
const listAllMembers = vi.hoisted(() => vi.fn())
const listRoundEntries = vi.hoisted(() => vi.fn())
vi.mock('../db/rounds', () => ({ listRounds }))
vi.mock('../db/weeks', () => ({ listWeeksByRound }))
vi.mock('../db/members', () => ({ listAllMembers }))
vi.mock('../db/logEntries', () => ({ listRoundEntries }))

beforeEach(() => {
  vi.clearAllMocks()
  listRounds.mockResolvedValue([
    {
      id: 'R1',
      name: 'Round 1',
      start_date: '2020-01-01',
      end_date: '2020-06-30',
      status: 'closed',
    },
    { id: 'R2', name: 'Round 2', start_date: '2020-07-01', end_date: '2020-12-31', status: 'open' },
  ])
  listAllMembers.mockResolvedValue([
    { id: 'a', name: 'Alice' },
    { id: 'b', name: 'Bob' },
    { id: 'c', name: 'Carol' },
  ])
})

describe('getPackWeekly', () => {
  it('defaults to the open round and aligns per-week totals (null for missing)', async () => {
    listWeeksByRound.mockResolvedValue([
      { id: 'W2', round_id: 'R2', week_number: 2 },
      { id: 'W1', round_id: 'R2', week_number: 1 }, // out of order → service sorts
    ])
    listRoundEntries.mockResolvedValue([
      { member_id: 'a', week_id: 'W1', final_points: 100 },
      { member_id: 'a', week_id: 'W2', final_points: 40 },
      { member_id: 'b', week_id: 'W2', final_points: 60 },
    ])

    const out = await getPackWeekly()

    expect(out.roundId).toBe('R2') // open round
    expect(listWeeksByRound).toHaveBeenCalledWith('R2')
    expect(out.weeks.map((w) => w.weekNumber)).toEqual([1, 2]) // sorted
    const alice = out.members.find((m) => m.memberId === 'a')!
    expect(alice.weekly).toEqual([100, 40])
    const bob = out.members.find((m) => m.memberId === 'b')!
    expect(bob.weekly).toEqual([null, 60]) // no W1 entry → null
    // Carol logged nothing this round → excluded.
    expect(out.members.some((m) => m.memberId === 'c')).toBe(false)
  })

  it('honours an explicit roundId', async () => {
    listWeeksByRound.mockResolvedValue([{ id: 'W1', round_id: 'R1', week_number: 1 }])
    listRoundEntries.mockResolvedValue([{ member_id: 'a', week_id: 'W1', final_points: 20 }])

    const out = await getPackWeekly('R1')
    expect(out.roundId).toBe('R1')
    expect(listWeeksByRound).toHaveBeenCalledWith('R1')
  })

  it('returns an empty shape when there are no rounds', async () => {
    listRounds.mockResolvedValue([])
    const out = await getPackWeekly()
    expect(out).toEqual({ roundId: '', roundName: '', weeks: [], members: [] })
  })
})

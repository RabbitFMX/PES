import { describe, expect, it, vi } from 'vitest'
import { getActivity, listActiveActivities } from './activities'
import type { Supabase } from './supabaseClient'

/** Minimal chainable stub of the supabase-js query builder for `.select().eq()...`. */
function mockListClient(result: { data: unknown; error: unknown }) {
  const order = vi.fn().mockResolvedValue(result)
  const eq = vi.fn(() => ({ order }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))
  return { client: { from } as unknown as Supabase, spies: { from, select, eq, order } }
}

function mockSingleClient(result: { data: unknown; error: unknown }) {
  const maybeSingle = vi.fn().mockResolvedValue(result)
  const eq = vi.fn(() => ({ maybeSingle }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))
  return { client: { from } as unknown as Supabase, spies: { from, select, eq, maybeSingle } }
}

describe('listActiveActivities', () => {
  it('queries active activities ordered by Czech name and returns the rows', async () => {
    const rows = [
      { id: 'run', active: true },
      { id: 'swim', active: true },
    ]
    const { client, spies } = mockListClient({ data: rows, error: null })

    const result = await listActiveActivities(client)

    expect(spies.from).toHaveBeenCalledWith('activity')
    expect(spies.eq).toHaveBeenCalledWith('active', true)
    expect(spies.order).toHaveBeenCalledWith('name_cs', { ascending: true })
    expect(result).toEqual(rows)
  })

  it('returns an empty array when the query yields no data', async () => {
    const { client } = mockListClient({ data: null, error: null })
    await expect(listActiveActivities(client)).resolves.toEqual([])
  })

  it('throws when the query errors', async () => {
    const { client } = mockListClient({ data: null, error: new Error('boom') })
    await expect(listActiveActivities(client)).rejects.toThrow('boom')
  })
})

describe('getActivity', () => {
  it('fetches a single activity by id', async () => {
    const row = { id: 'run', active: true }
    const { client, spies } = mockSingleClient({ data: row, error: null })

    const result = await getActivity('run', client)

    expect(spies.from).toHaveBeenCalledWith('activity')
    expect(spies.eq).toHaveBeenCalledWith('id', 'run')
    expect(result).toEqual(row)
  })

  it('returns null when the activity does not exist', async () => {
    const { client } = mockSingleClient({ data: null, error: null })
    await expect(getActivity('nope', client)).resolves.toBeNull()
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the fetch wrapper so these tests exercise the data layer without a
// network or a live backend.
const get = vi.hoisted(() => vi.fn())
const post = vi.hoisted(() => vi.fn())
vi.mock('./apiClient', () => ({
  apiClient: { get, post, patch: vi.fn(), put: vi.fn() },
  ApiError: class extends Error {},
}))

import {
  getActivities,
  previewDetailed,
  parseNaturalLanguage,
  submitChallenge,
  saveRotation,
} from './api'

describe('api data layer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getActivities reads GET /activities', async () => {
    get.mockResolvedValue([{ id: 'run', active: true }])
    const activities = await getActivities()
    expect(get).toHaveBeenCalledWith('/activities')
    expect(activities).toEqual([{ id: 'run', active: true }])
  })

  it('previewDetailed posts the input and echoes it back for commit', async () => {
    get.mockReset()
    post.mockResolvedValue({
      activityName: 'běh',
      quantity: 8,
      unit: 'km',
      rawPoints: 24,
      coefficient: 1.25,
      finalPoints: 30,
    })
    const input = { activityId: 'run', quantity: 8 }
    const preview = await previewDetailed(input)
    expect(post).toHaveBeenCalledWith('/log-entries/preview', input)
    expect(preview.finalPoints).toBe(30)
    expect(preview.input).toEqual(input)
  })

  it('submitChallenge resolves the current challenge id then posts the value', async () => {
    get.mockResolvedValue({ id: 'ch-1', submissions: [] })
    post.mockResolvedValue({ ok: true })
    const res = await submitChallenge(42)
    expect(get).toHaveBeenCalledWith('/challenges/current')
    expect(post).toHaveBeenCalledWith('/challenges/ch-1/submissions', { value: 42 })
    expect(res).toEqual({ ok: true })
  })

  it('saveRotation sends the ordered member ids', async () => {
    const put = (await import('./apiClient')).apiClient.put as ReturnType<typeof vi.fn>
    put.mockResolvedValue({ ok: true })
    await saveRotation([
      { memberId: 'b', displayName: 'B', orderPosition: 0 },
      { memberId: 'a', displayName: 'A', orderPosition: 1 },
    ])
    expect(put).toHaveBeenCalledWith('/admin/rotation', { memberIds: ['b', 'a'] })
  })

  it('parseNaturalLanguage stays a local mock: a number yields a committable preview', async () => {
    const previews = await parseNaturalLanguage('ran 8k this morning')
    expect(previews).toHaveLength(1)
    expect(previews[0].quantity).toBe(8)
    expect(previews[0].input).toEqual({ activityId: 'run', quantity: 8 })
  })

  it('parseNaturalLanguage rejects on the failure hook', async () => {
    await expect(parseNaturalLanguage('please fail')).rejects.toThrow()
  })
})

import { describe, expect, it } from 'vitest'
import { getActivities, login, parseNaturalLanguage, previewDetailed } from './mockApi'

describe('mockApi', () => {
  it('returns only active activities', async () => {
    const activities = await getActivities()
    expect(activities.length).toBeGreaterThan(0)
    expect(activities.every((a) => a.active)).toBe(true)
  })

  it('logs in an admin when the email hints at it', async () => {
    const admin = await login('admin@pes.dev', 'x')
    expect(admin.role).toBe('admin')
    const member = await login('bara@pes.dev', 'x')
    expect(member.role).toBe('member')
  })

  it('previews detailed points with the coefficient applied', async () => {
    const preview = await previewDetailed({ activityId: 'run', quantity: 8, elevationM: 200 })
    // 8*3 + (200/50)*1.5 = 30 raw, ×1.25 = 37.5
    expect(preview.rawPoints).toBe(30)
    expect(preview.finalPoints).toBe(37.5)
  })

  it('parses natural language containing a number', async () => {
    const previews = await parseNaturalLanguage('ran 8k this morning')
    expect(previews).toHaveLength(1)
    expect(previews[0].quantity).toBe(8)
  })

  it('rejects when the text triggers the failure hook', async () => {
    await expect(parseNaturalLanguage('please fail')).rejects.toThrow()
  })
})

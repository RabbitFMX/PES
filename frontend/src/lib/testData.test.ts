import { beforeEach, describe, expect, it } from 'vitest'
import { isTestDataEnabled, setTestDataEnabled, TEST_DATA_STORAGE_KEY } from './testData'

beforeEach(() => localStorage.clear())

describe('test-data flag', () => {
  it('is off by default', () => {
    expect(isTestDataEnabled()).toBe(false)
  })

  it('enables and disables, persisting to localStorage', () => {
    setTestDataEnabled(true)
    expect(isTestDataEnabled()).toBe(true)
    expect(localStorage.getItem(TEST_DATA_STORAGE_KEY)).toBe('1')

    setTestDataEnabled(false)
    expect(isTestDataEnabled()).toBe(false)
    expect(localStorage.getItem(TEST_DATA_STORAGE_KEY)).toBeNull()
  })
})

import { describe, expect, it, vi } from 'vitest'
import type { Request, Response } from 'express'
import { TEST_DATA_HEADER, testModeMiddleware } from './testMode'
import { isTestMode } from '../testData/context'

function fakeReq(headerValue?: string): Request {
  return {
    get: (name: string) => (name.toLowerCase() === TEST_DATA_HEADER ? headerValue : undefined),
  } as unknown as Request
}

describe('testModeMiddleware', () => {
  it('runs downstream with test mode ON when the header is "1"', () => {
    let seen = false
    const next = vi.fn(() => {
      seen = isTestMode()
    })
    testModeMiddleware(fakeReq('1'), {} as Response, next)
    expect(next).toHaveBeenCalledOnce()
    expect(seen).toBe(true)
  })

  it('leaves test mode OFF without the header', () => {
    let seen = true
    const next = vi.fn(() => {
      seen = isTestMode()
    })
    testModeMiddleware(fakeReq(undefined), {} as Response, next)
    expect(seen).toBe(false)
  })

  it('leaves test mode OFF for any value other than "1"', () => {
    let seen = true
    const next = vi.fn(() => {
      seen = isTestMode()
    })
    testModeMiddleware(fakeReq('true'), {} as Response, next)
    expect(seen).toBe(false)
  })

  it('isTestMode is false outside any request context', () => {
    expect(isTestMode()).toBe(false)
  })
})

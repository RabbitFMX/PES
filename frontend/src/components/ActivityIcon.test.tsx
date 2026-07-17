import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ActivityIcon, activityIconKey } from './ActivityIcon'

describe('activityIconKey', () => {
  it('maps known activities, sharing a glyph for near-variants', () => {
    expect(activityIconKey('run')).toBe('run')
    expect(activityIconKey('swim')).toBe('swim')
    expect(activityIconKey('bike-road')).toBe('bike')
    expect(activityIconKey('bike-mtb')).toBe('bike')
    expect(activityIconKey('xcski')).toBe('ski')
    expect(activityIconKey('downhill')).toBe('ski')
    expect(activityIconKey('pushups')).toBe('strength')
    expect(activityIconKey('pullups')).toBe('bar')
  })

  it('falls back to generic for unknown, null or undefined ids', () => {
    expect(activityIconKey('does-not-exist')).toBe('generic')
    expect(activityIconKey(null)).toBe('generic')
    expect(activityIconKey(undefined)).toBe('generic')
  })
})

describe('ActivityIcon', () => {
  it('renders an accessible label when a title is given, decorative otherwise', () => {
    const { container, rerender } = render(<ActivityIcon activityId="run" title="Running" />)
    const svg = container.querySelector('svg')!
    expect(svg).toHaveAttribute('aria-label', 'Running')

    rerender(<ActivityIcon activityId="run" />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })
})

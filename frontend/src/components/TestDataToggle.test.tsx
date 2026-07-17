import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import i18n from '../i18n'
import { TestDataToggle } from './TestDataToggle'

const isTestDataEnabled = vi.hoisted(() => vi.fn())
const setTestDataEnabled = vi.hoisted(() => vi.fn())
vi.mock('../lib/testData', () => ({ isTestDataEnabled, setTestDataEnabled }))

const originalLocation = window.location

describe('TestDataToggle', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en')
  })
  afterEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
  })

  it('reflects the current state via aria-checked', () => {
    isTestDataEnabled.mockReturnValue(true)
    render(<TestDataToggle />)
    expect(screen.getByRole('switch', { name: 'Test data' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  it('flips the flag and reloads on click', async () => {
    isTestDataEnabled.mockReturnValue(false)
    const reload = vi.fn()
    Object.defineProperty(window, 'location', { configurable: true, value: { reload } })
    const user = userEvent.setup()
    render(<TestDataToggle />)

    await user.click(screen.getByRole('switch'))

    expect(setTestDataEnabled).toHaveBeenCalledWith(true)
    expect(reload).toHaveBeenCalledOnce()
  })
})

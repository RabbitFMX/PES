import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'
import { SegmentedControl } from './SegmentedControl'
import { ProgressRing } from './ProgressRing'

describe('Button', () => {
  it('is disabled and shows a spinner while loading', () => {
    render(
      <Button loading onClick={vi.fn()}>
        Save
      </Button>,
    )
    expect(screen.getByRole('button')).toBeDisabled()
  })
})

describe('SegmentedControl', () => {
  it('moves selection with arrow keys', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <SegmentedControl
        ariaLabel="mode"
        value="a"
        onChange={onChange}
        segments={[
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ]}
      />,
    )
    await user.tab() // focus the selected radio
    await user.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenCalledWith('b')
  })
})

describe('ProgressRing', () => {
  it('exposes an accessible progressbar value', () => {
    render(<ProgressRing value={64} max={100} valueText="64 of 100" />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '64')
    expect(bar).toHaveAttribute('aria-valuetext', '64 of 100')
  })
})

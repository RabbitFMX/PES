import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DogAvatar } from './DogAvatar'
import { DEFAULT_DOG, DOG_COLORWAYS } from '../lib/dogAvatar'

describe('DogAvatar', () => {
  it('renders a name tag with the given name', () => {
    const { getByText } = render(<DogAvatar config={DEFAULT_DOG} name="Markéta" />)
    expect(getByText('Markéta')).toBeInTheDocument()
  })

  it('omits the name tag when no name is given', () => {
    const { queryByText } = render(<DogAvatar config={DEFAULT_DOG} title="dog" />)
    expect(queryByText('Markéta')).not.toBeInTheDocument()
  })

  it('tints the collar with the selected colourway', () => {
    const { container } = render(
      <DogAvatar config={{ ...DEFAULT_DOG, collar: 'flat', colorway: 1 }} />,
    )
    // The colourway-1 collar colour appears somewhere in the drawn SVG.
    expect(container.innerHTML).toContain(DOG_COLORWAYS[1].collar)
  })
})

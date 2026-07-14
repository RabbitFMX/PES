import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import i18n from '../../i18n'
import { ToastProvider } from '../../context/ToastProvider'
import { LogActivityModal } from './LogActivityModal'

function renderModal(onClose = vi.fn()) {
  render(
    <ToastProvider>
      <LogActivityModal open onClose={onClose} />
    </ToastProvider>,
  )
  return onClose
}

describe('LogActivityModal', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en')
  })

  it('runs the quick-add → preview → confirm flow', async () => {
    const user = userEvent.setup()
    const onClose = renderModal()

    // Switch to Quick-add mode
    await user.click(screen.getByRole('radio', { name: 'Quick-add' }))
    await user.type(screen.getByLabelText('Points'), '40')
    await user.click(screen.getByRole('button', { name: 'Preview' }))

    // Preview shows the coefficient formula (40 ×1.25 = 50)
    expect(await screen.findByText(/40 ×1.25 = 50 pts/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })
})

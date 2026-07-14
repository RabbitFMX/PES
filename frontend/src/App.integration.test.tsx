import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import i18n from './i18n'
import { ThemeProvider } from './context/ThemeProvider'
import { AuthProvider } from './context/AuthProvider'
import { ToastProvider } from './context/ToastProvider'

function renderApp(initial = '/login') {
  return render(
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={[initial]}>
            <App />
          </MemoryRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>,
  )
}

describe('login → app navigation', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en')
  })

  it('signs in and lands on the dashboard, then navigates to the leaderboard', async () => {
    const user = userEvent.setup()
    renderApp('/login')

    await user.type(screen.getByLabelText('Email'), 'bara@pes.dev')
    await user.type(screen.getByLabelText('Password'), 'secret')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    // Login applies the member's saved language preference (Czech). Assert the
    // language-independent progress ring value to confirm the dashboard loaded.
    const ring = await screen.findByRole('progressbar', {}, { timeout: 3000 })
    expect(ring).toHaveAttribute('aria-valuetext', '64 / 100')

    // Navigate to the leaderboard (TopBar + BottomTabBar both render the link).
    await user.click(screen.getAllByRole('link', { name: 'Žebříček' })[0])
    expect(
      await screen.findByRole('heading', { name: 'Žebříček' }, { timeout: 3000 }),
    ).toBeInTheDocument()
  })
})
